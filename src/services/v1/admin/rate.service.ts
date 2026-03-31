import Anthropic from '@anthropic-ai/sdk';
import HttpStatus from 'http-status-codes';
import { ENV } from '../../../config/env';

const client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });

type RateSource = 'live' | 'static';

/**
 * Static fallback rates used when live provider fails.
 * Keep these conservative and update occasionally.
 *
 * Interpretation: 1 unit of `from` equals `rate` units of `to`.
 */
const STATIC_RATES: Record<string, Record<string, number>> = {
  USD: {
    INR: 93.5,
    AED: 3.67,
  },
};

const getStaticRate = (from: string, to: string): number | null => {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  // direct
  const direct = STATIC_RATES[f]?.[t];
  if (Number.isFinite(direct)) return direct;

  // inverse (if we have USD->X, compute X->USD, etc.)
  const invBase = STATIC_RATES[t]?.[f];
  if (Number.isFinite(invBase) && invBase !== 0) return 1 / invBase;

  // via USD (common case)
  if (f !== 'USD' && t !== 'USD') {
    const fToUsd = getStaticRate(f, 'USD');
    const usdToT = getStaticRate('USD', t);
    if (fToUsd != null && usdToT != null) return fToUsd * usdToT;
  }

  return null;
};

const parseRatio = (text: string): number => {
  const raw = text.trim();
  const ratio = parseFloat(raw);
  if (!Number.isFinite(ratio)) {
    const err: any = new Error('Could not parse ratio from Claude');
    err.status = HttpStatus.INTERNAL_SERVER_ERROR;
    err.raw = raw;
    throw err;
  }
  return ratio;
};

export const getLiveExchangeRateRatio = async (from: string, to: string): Promise<number> => {
  if (!ENV.ANTHROPIC_API_KEY) {
    const err: any = new Error('ANTHROPIC_API_KEY is not configured');
    err.status = HttpStatus.INTERNAL_SERVER_ERROR;
    throw err;
  }

  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `What is the current live exchange rate from ${fromCode} to ${toCode}?

Reply with ONLY a single decimal number — the exchange rate ratio. Nothing else. No text, no symbols, no explanation.
Example reply: 0.011924`,
      },
    ],
  });

  const first = message.content?.[0];
  const ratioText = typeof (first as any)?.text === 'string' ? (first as any).text : '';
  return parseRatio(ratioText);
};

export const getExchangeRateRatioWithFallback = async (
  from: string,
  to: string,
): Promise<{ ratio: number; source: RateSource }> => {
  try {
    const ratio = await getLiveExchangeRateRatio(from, to);
    return { ratio, source: 'live' };
  } catch(error: any) {
    console.error('Error fetching live exchange rate ratio:', error);
    const staticRatio = getStaticRate(from, to);
    if (staticRatio == null) {
      const err: any = new Error('Could not fetch live ratio and no static fallback is configured for this pair');
      err.status = HttpStatus.SERVICE_UNAVAILABLE;
      throw err;
    }
    return { ratio: staticRatio, source: 'static' };
  }
};

