/** Cart workflow status. */
export enum CartStatus {
    GENERATE = 'generate',
    SEND = 'send',
    UPDATED = 'updated',
    APPROVED = 'approved',
}

export const CART_STATUS_DEFAULT = CartStatus.GENERATE;

/** ISO-style codes for cart pricing / proposal currency. */
export enum CartCurrency {
    USD = 'USD',
    INR = 'INR',
    AED = 'AED',
}

export const CART_CURRENCY_DEFAULT = CartCurrency.USD;

export const CART_CURRENCY_CODES: CartCurrency[] = Object.values(CartCurrency);

/** Symbol / prefix shown before amounts in proposals (PDF, emails). */
export function getCartCurrencySymbol(currency: string): string {
    const u = String(currency).trim().toUpperCase();
    if (u === CartCurrency.INR) return '₹';
    if (u === CartCurrency.AED) return 'AED ';
    return '$';
}

/** Short human label for proposals (e.g. PDF subtitle). */
export function getCartCurrencyDisplayName(currency: string): string {
    const u = String(currency).trim().toUpperCase();
    if (u === CartCurrency.USD) return 'US Dollar';
    if (u === CartCurrency.INR) return 'Indian Rupee';
    if (u === CartCurrency.AED) return 'UAE Dirham';
    return u;
}

function isCartCurrencyCode(s: string): s is CartCurrency {
    return (CART_CURRENCY_CODES as string[]).includes(s);
}

/**
 * Resolve currency from API input. Empty/absent uses `defaultCurrency`.
 * Non-empty invalid values throw (caller should map to HTTP 400).
 */
export function resolveCartCurrency(
    raw: unknown,
    defaultCurrency: CartCurrency = CART_CURRENCY_DEFAULT,
): CartCurrency {
    if (raw === undefined || raw === null) return defaultCurrency;
    const u = String(raw).trim().toUpperCase();
    if (u === '') return defaultCurrency;
    if (!isCartCurrencyCode(u)) {
        throw new Error(`Invalid currency. Allowed: ${CART_CURRENCY_CODES.join(', ')}`);
    }
    return u;
}
