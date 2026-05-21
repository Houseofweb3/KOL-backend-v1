/** Whether the client has completed payment for this invoice. */
export const KOAL_INVOICE_STATUS_UNPAID = 'unpaid' as const;
export const KOAL_INVOICE_STATUS_PAID = 'paid' as const;

export type KoalInvoiceStatus = typeof KOAL_INVOICE_STATUS_UNPAID | typeof KOAL_INVOICE_STATUS_PAID;

export const KOAL_INVOICE_STATUS_VALUES: KoalInvoiceStatus[] = [
    KOAL_INVOICE_STATUS_UNPAID,
    KOAL_INVOICE_STATUS_PAID,
];

export function isKoalInvoiceStatus(value: unknown): value is KoalInvoiceStatus {
    return value === KOAL_INVOICE_STATUS_UNPAID || value === KOAL_INVOICE_STATUS_PAID;
}

/** How the invoice instructs the payer to pay. */
export const KOAL_INVOICE_PAYMENT_BANK = 'bank' as const;
export const KOAL_INVOICE_PAYMENT_CRYPTO = 'crypto' as const;

export type KoalInvoicePaymentDetails =
    | typeof KOAL_INVOICE_PAYMENT_BANK
    | typeof KOAL_INVOICE_PAYMENT_CRYPTO;

export const KOAL_INVOICE_PAYMENT_VALUES: KoalInvoicePaymentDetails[] = [
    KOAL_INVOICE_PAYMENT_BANK,
    KOAL_INVOICE_PAYMENT_CRYPTO,
];

export function isKoalInvoicePaymentDetails(value: unknown): value is KoalInvoicePaymentDetails {
    return value === KOAL_INVOICE_PAYMENT_BANK || value === KOAL_INVOICE_PAYMENT_CRYPTO;
}

/** Human-readable prefix for generated invoice numbers (`INV-2026-001`). */
export const KOAL_INVOICE_NUMBER_PREFIX = 'INV' as const;

/** Minimum digit width for the per-year sequence segment (001, 002, …). */
export const KOAL_INVOICE_SEQUENCE_PAD = 3;

/**
 * Build a canonical Koal invoice number: `INV-<year>-<sequence>` with zero-padded sequence.
 * Sequence grows beyond the pad width when needed (e.g. `INV-2026-1000`).
 */
export function buildKoalInvoiceNumber(year: number, sequence: number): string {
    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
        throw new RangeError('year must be an integer between 2000 and 9999');
    }
    if (!Number.isInteger(sequence) || sequence < 1) {
        throw new RangeError('sequence must be a positive integer');
    }
    const seqPart = String(sequence).padStart(KOAL_INVOICE_SEQUENCE_PAD, '0');
    return `${KOAL_INVOICE_NUMBER_PREFIX}-${year}-${seqPart}`;
}

/** Parse `INV-YYYY-NNN…` into year + numeric sequence; returns `null` if the shape does not match. */
export function parseKoalInvoiceNumber(value: string): { year: number; sequence: number } | null {
    const trimmed = value.trim();
    const m = trimmed.match(new RegExp(`^${KOAL_INVOICE_NUMBER_PREFIX}-(\\d{4})-(\\d+)$`));
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const sequence = parseInt(m[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(sequence) || sequence < 1) return null;
    return { year, sequence };
}

/** Letterhead brand on generated Koal invoice PDFs. */
export const KOAL_INVOICE_PDF_COMPANY_BRAND = 'AMPLI5';

/** One project line on the invoice (client reference + amount). */
export interface KoalInvoiceProjectLine {
    clientId: string;
    /** Amount for this client/project line (major currency units). */
    amount: number;
}
