import HttpStatus from 'http-status-codes';

/**
 * Unit proposal amount stored on cart line = influencer sell price × ratio (multiplier).
 * e.g. ratio 1.15 → 15% above sell price.
 */
export function proposalUnitPriceFromSellPrice(
    sellPriceRaw: string | number | null | undefined,
    ratio: number
): string {
    if (sellPriceRaw == null || String(sellPriceRaw).trim() === '') {
        const err = new Error('Influencer sell price is required for ratio-based pricing');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const cleaned = String(sellPriceRaw).replace(/[$,]/g, '').trim();
    const sell = parseFloat(cleaned);
    if (!Number.isFinite(sell) || sell < 0) {
        const err = new Error('Invalid influencer sell price');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const v = sell * ratio;
    if (!Number.isFinite(v) || v < 0) {
        const err = new Error('Invalid proposal unit price after applying ratio');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return v.toFixed(2);
}

/** When `ratio` is present in the request body it must be a finite number > 0. */
export function parseProposalRatioFromBody(raw: unknown): number {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        const err = new Error('ratio is required and must be a finite number greater than 0');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
    if (!Number.isFinite(n) || n <= 0) {
        const err = new Error('ratio must be a finite number greater than 0');
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return n;
}

/** When `ratio` is omitted from the body, use default (e.g. 1). Invalid values still throw. */
export function parseProposalRatioWithDefault(raw: unknown, defaultRatio: number): number {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        if (!Number.isFinite(defaultRatio) || defaultRatio <= 0) return 1;
        return defaultRatio;
    }
    return parseProposalRatioFromBody(raw);
}

export function formatPriceRatioForDb(ratio: number): string {
    return ratio.toFixed(4);
}
