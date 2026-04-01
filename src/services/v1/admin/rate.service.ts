import HttpStatus from 'http-status-codes';
import { ENV } from '../../../config/env';

type RateSource = 'live' | 'static';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

/**
 * Static fallback rates used when live provider fails (no key, rate limit, unsupported pair, etc.).
 * Interpretation: 1 unit of `from` equals `rate` units of `to`.
 */
const STATIC_RATES: Record<string, Record<string, number>> = {
  USD: {
    INR: 93.5,
    AED: 3.67,
    SGD: 1.35,
    EUR: 0.92,
    GBP: 0.79,
  },
};

const getStaticRate = (from: string, to: string): number | null => {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  const direct = STATIC_RATES[f]?.[t];
  if (Number.isFinite(direct)) return direct;

  const invBase = STATIC_RATES[t]?.[f];
  if (Number.isFinite(invBase) && invBase !== 0) return 1 / invBase;

  if (f !== 'USD' && t !== 'USD') {
    const fToUsd = getStaticRate(f, 'USD');
    const usdToT = getStaticRate('USD', t);
    if (fToUsd != null && usdToT != null) return fToUsd * usdToT;
  }

  return null;
};

type AlphaVantageJson = Record<string, unknown>;

function parseAlphaVantageExchangeRate(data: AlphaVantageJson, fromCode: string, toCode: string): number {
  const note = data.Note;
  const errMsg = data['Error Message'];
  const info = data.Information;
  if (typeof note === 'string' && note.length > 0) {
    const e = new Error('Alpha Vantage rate limit or usage note returned') as Error & { status?: number };
    e.status = HttpStatus.TOO_MANY_REQUESTS;
    throw e;
  }
  if (typeof errMsg === 'string' && errMsg.length > 0) {
    const e = new Error(`Alpha Vantage: ${errMsg}`) as Error & { status?: number };
    e.status = HttpStatus.BAD_GATEWAY;
    throw e;
  }
  if (typeof info === 'string' && info.length > 0) {
    const e = new Error('Alpha Vantage: invalid API key or request') as Error & { status?: number };
    e.status = HttpStatus.BAD_GATEWAY;
    throw e;
  }

  const block = data['Realtime Currency Exchange Rate'];
  if (!block || typeof block !== 'object') {
    const e = new Error(`No exchange rate block for ${fromCode} -> ${toCode}`) as Error & { status?: number };
    e.status = HttpStatus.INTERNAL_SERVER_ERROR;
    throw e;
  }

  const rateStr = (block as Record<string, unknown>)['5. Exchange Rate'];
  if (typeof rateStr !== 'string') {
    const e = new Error(`No rate field for ${fromCode} -> ${toCode}`) as Error & { status?: number };
    e.status = HttpStatus.INTERNAL_SERVER_ERROR;
    throw e;
  }

  const rate = parseFloat(rateStr.trim());
  if (!Number.isFinite(rate) || rate <= 0) {
    const e = new Error(`Invalid exchange rate for ${fromCode} -> ${toCode}`) as Error & { status?: number };
    e.status = HttpStatus.INTERNAL_SERVER_ERROR;
    throw e;
  }

  return rate;
}

/**
 * Live ratio: amount_in_to = amount_in_from * rate (Alpha Vantage CURRENCY_EXCHANGE_RATE).
 * Requires ALPHA_VANTAGE_API_KEY in env (free key from https://www.alphavantage.co/support/#api-key).
 */
export const getLiveExchangeRateRatio = async (from: string, to: string): Promise<number> => {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  if (fromCode === toCode) return 1;

  const apiKey = ENV.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('ALPHA_VANTAGE_API_KEY is not configured') as Error & { status?: number };
    err.status = HttpStatus.INTERNAL_SERVER_ERROR;
    throw err;
  }

  const params = new URLSearchParams({
    function: 'CURRENCY_EXCHANGE_RATE',
    from_currency: fromCode,
    to_currency: toCode,
    apikey: apiKey,
  });

  const url = `${ALPHA_VANTAGE_BASE}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const err = new Error(
      `Alpha Vantage HTTP error (${response.status}) for ${fromCode} -> ${toCode}`,
    ) as Error & { status?: number };
    err.status = HttpStatus.BAD_GATEWAY;
    throw err;
  }

  const data = (await response.json()) as AlphaVantageJson;
  return parseAlphaVantageExchangeRate(data, fromCode, toCode);
};

export const getExchangeRateRatioWithFallback = async (
  from: string,
  to: string,
): Promise<{ ratio: number; source: RateSource }> => {
  try {
    const ratio = await getLiveExchangeRateRatio(from, to);
    return { ratio, source: 'live' };
  } catch {
    const staticRatio = getStaticRate(from, to);
    if (staticRatio == null) {
      const err = new Error(
        'Could not fetch live ratio and no static fallback is configured for this pair',
      ) as Error & { status?: number };
      err.status = HttpStatus.SERVICE_UNAVAILABLE;
      throw err;
    }
    return { ratio: staticRatio, source: 'static' };
  }
};
