import HttpStatus from 'http-status-codes';
import { QueryFailedError } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Client } from '../../../entity/client.entity';
import { Influencer } from '../../../entity/influencer.entity';
import { KoalInvoice } from '../../../entity/kol-invoice.entity';
import {
    buildKoalInvoiceNumber,
    isKoalInvoicePaymentDetails,
    isKoalInvoiceStatus,
    KOAL_INVOICE_NUMBER_PREFIX,
    KOAL_INVOICE_PAYMENT_BANK,
    KOAL_INVOICE_PAYMENT_CRYPTO,
    KOAL_INVOICE_STATUS_PAID,
    KOAL_INVOICE_STATUS_UNPAID,
    parseKoalInvoiceNumber,
    resolveKoalInvoiceCurrency,
    type KoalInvoicePaymentDetails,
    type KoalInvoiceCurrency,
    type KoalInvoiceLineItem,
    type KoalInvoiceStatus,
} from '../../../constants/kol-invoice';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function notFound(message: string): Error {
    const err = new Error(message);
    (err as Error & { status: number }).status = HttpStatus.NOT_FOUND;
    return err;
}

function badRequest(message: string): Error {
    const err = new Error(message);
    (err as Error & { status: number }).status = HttpStatus.BAD_REQUEST;
    return err;
}

function isPgUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (error as QueryFailedError & { driverError?: { code?: string } }).driverError;
    return driverError?.code === '23505';
}

/** Uniqueness applies only to non-deleted invoices (matches partial DB index). */
async function assertInvoiceNumberAvailable(invoiceNumber: string, excludeId?: string): Promise<void> {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const existing = await repo.findOne({ where: { invoiceNumber, isDeleted: false } });
    if (!existing) return;
    if (excludeId && existing.id === excludeId) return;
    throw badRequest('invoiceNumber already exists');
}

function rethrowIfInvoiceNumberConflict(error: unknown): never {
    if (isPgUniqueViolation(error)) {
        throw badRequest('invoiceNumber already exists');
    }
    throw error;
}

async function assertInfluencerExists(id: string): Promise<void> {
    const repo = AppDataSource.getRepository(Influencer);
    const row = await repo.findOne({ where: { id, isDeleted: false } });
    if (!row) throw notFound('Influencer not found');
}

async function assertClientExists(id: string): Promise<void> {
    const repo = AppDataSource.getRepository(Client);
    const row = await repo.findOne({ where: { id, isDeleted: false } });
    if (!row) throw notFound('Client not found');
}

function parseInvoiceDate(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw badRequest('invoiceDate is required (ISO date string, e.g. 2026-05-12)');
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw badRequest('invoiceDate is invalid');
    return d.toISOString().slice(0, 10);
}

function normalizeClientId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw badRequest('clientId is required (uuid)');
    }
    return value.trim();
}

function normalizeLineItems(value: unknown): KoalInvoiceLineItem[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw badRequest('lineItems must be a non-empty array of { deliverable, amount }');
    }
    const out: KoalInvoiceLineItem[] = [];
    for (const row of value) {
        if (!row || typeof row !== 'object') throw badRequest('Each line item must be an object');
        const deliverable = (row as { deliverable?: unknown }).deliverable;
        const amount = (row as { amount?: unknown }).amount;
        if (typeof deliverable !== 'string' || !deliverable.trim()) {
            throw badRequest('Each line item requires deliverable (non-empty string)');
        }
        const num = typeof amount === 'number' ? amount : typeof amount === 'string' ? parseFloat(amount) : NaN;
        if (!Number.isFinite(num) || num <= 0) {
            throw badRequest('Each line item amount must be a positive number');
        }
        out.push({ deliverable: deliverable.trim(), amount: num });
    }
    return out;
}

function normalizeAmountPayable(value: unknown): string {
    const num = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
    if (!Number.isFinite(num) || num <= 0) {
        throw badRequest('amountPayable must be a positive number');
    }
    return num.toFixed(2);
}

function validatePaymentPayload(
    paymentDetails: KoalInvoicePaymentDetails,
    bank: {
        bankAccountHolderName: string | null;
        bankName: string | null;
        bankAccountNumberOrIban: string | null;
        bankSwiftOrIfsc: string | null;
        bankCountry: string | null;
    },
    crypto: { cryptoChainAddress: string | null; cryptoWalletAddress: string | null }
): void {
    if (paymentDetails === KOAL_INVOICE_PAYMENT_BANK) {
        if (!bank.bankAccountHolderName?.trim()) throw badRequest('bankAccountHolderName is required when paymentDetails is bank');
        if (!bank.bankName?.trim()) throw badRequest('bankName is required when paymentDetails is bank');
        if (!bank.bankAccountNumberOrIban?.trim()) {
            throw badRequest('bankAccountNumberOrIban is required when paymentDetails is bank');
        }
        if (!bank.bankSwiftOrIfsc?.trim()) throw badRequest('bankSwiftOrIfsc is required when paymentDetails is bank');
        if (!bank.bankCountry?.trim()) throw badRequest('bankCountry is required when paymentDetails is bank');
    } else {
        if (!crypto.cryptoChainAddress?.trim()) throw badRequest('cryptoChainAddress is required when paymentDetails is crypto');
        if (!crypto.cryptoWalletAddress?.trim()) throw badRequest('cryptoWalletAddress is required when paymentDetails is crypto');
    }
}

export interface ListKoalInvoicesOptions {
    page?: number;
    limit?: number;
    search?: string;
    /** Filter by payment status: `unpaid` or `paid`. */
    status?: KoalInvoiceStatus;
}

export interface ListKoalInvoicesResult {
    invoices: KoalInvoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const listKoalInvoices = async (options: ListKoalInvoicesOptions = {}): Promise<ListKoalInvoicesResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';

    const repo = AppDataSource.getRepository(KoalInvoice);
    const qb = repo
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.invoiceByInfluencer', 'byInf')
        .leftJoinAndSelect('inv.client', 'client')
        .where('inv.isDeleted = :isDeleted', { isDeleted: false })
        .orderBy('inv.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    if (search) {
        qb.andWhere('inv.invoiceNumber ILIKE :search', { search: `%${search}%` });
    }
    if (options.status) {
        qb.andWhere('inv.status = :invStatus', { invStatus: options.status });
    }

    const [invoices, total] = await qb.getManyAndCount();
    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const INVOICE_YEAR_MIN = 2000;
const INVOICE_YEAR_MAX = 9999;

function resolveNextInvoiceYear(explicitYear: unknown): number {
    if (explicitYear === undefined || explicitYear === null || explicitYear === '') {
        return new Date().getUTCFullYear();
    }
    if (typeof explicitYear === 'number' && Number.isInteger(explicitYear)) {
        if (explicitYear < INVOICE_YEAR_MIN || explicitYear > INVOICE_YEAR_MAX) {
            throw badRequest(`year must be an integer between ${INVOICE_YEAR_MIN} and ${INVOICE_YEAR_MAX}`);
        }
        return explicitYear;
    }
    const s = String(explicitYear).trim();
    if (!/^\d{4}$/.test(s)) {
        throw badRequest(`year must be a 4-digit integer between ${INVOICE_YEAR_MIN} and ${INVOICE_YEAR_MAX}`);
    }
    const y = parseInt(s, 10);
    if (y < INVOICE_YEAR_MIN || y > INVOICE_YEAR_MAX) {
        throw badRequest(`year must be an integer between ${INVOICE_YEAR_MIN} and ${INVOICE_YEAR_MAX}`);
    }
    return y;
}

/**
 * Highest existing `INV-<year>-<n>` among non-deleted rows (by numeric `n`), plus that invoice number string.
 */
async function getMaxInvYearSequence(year: number): Promise<{ maxSequence: number; lastInvoiceNumber: string | null }> {
    const re = `^${KOAL_INVOICE_NUMBER_PREFIX}-${year}-[0-9]+$`;
    const rows: { invoiceNumber: string }[] = await AppDataSource.manager.query(
        `SELECT invoice_number AS "invoiceNumber" FROM koal_invoices WHERE is_deleted = false AND invoice_number ~ $1`,
        [re]
    );

    let maxSequence = 0;
    let lastInvoiceNumber: string | null = null;
    for (const row of rows) {
        const num = row.invoiceNumber;
        const parsed = parseKoalInvoiceNumber(num);
        if (!parsed || parsed.year !== year) continue;
        if (parsed.sequence > maxSequence) {
            maxSequence = parsed.sequence;
            lastInvoiceNumber = num.trim();
        }
    }
    return { maxSequence, lastInvoiceNumber };
}

export interface NextKoalInvoiceNumberResult {
    /** Calendar year this suggestion applies to (`INV-<year>-…`). */
    year: number;
    /** Next value safe to pre-fill in the create form (checked for uniqueness among non-deleted rows). */
    invoiceNumber: string;
    /** Highest existing `INV-<year>-<n>` for that year, or `null` if none. */
    lastInvoiceNumber: string | null;
}

/**
 * Suggest the next invoice number for a calendar year: `INV-<year>-001`, `INV-<year>-002`, …
 * Uses the max existing sequence for that year among non-deleted rows matching `INV-YYYY-<digits>`.
 * Optional `year` (default: current UTC year). Re-checks the DB for uniqueness (concurrent creates / manual numbers).
 */
export const getNextKoalInvoiceNumber = async (options: { year?: unknown } = {}): Promise<NextKoalInvoiceNumberResult> => {
    const year = resolveNextInvoiceYear(options.year);
    const repo = AppDataSource.getRepository(KoalInvoice);
    const { maxSequence, lastInvoiceNumber } = await getMaxInvYearSequence(year);

    let seq = maxSequence + 1;
    let candidate = buildKoalInvoiceNumber(year, seq);

    for (let i = 0; i < 100; i += 1) {
        const taken = await repo.existsBy({ invoiceNumber: candidate, isDeleted: false });
        if (!taken) {
            return { year, invoiceNumber: candidate, lastInvoiceNumber };
        }
        seq += 1;
        candidate = buildKoalInvoiceNumber(year, seq);
    }
    const err = new Error('Could not allocate a unique invoice number');
    (err as Error & { status: number }).status = HttpStatus.CONFLICT;
    throw err;
};

export const getKoalInvoiceById = async (id: string): Promise<KoalInvoice> => {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const inv = await repo.findOne({
        where: { id, isDeleted: false },
        relations: ['invoiceByInfluencer', 'client'],
    });
    if (!inv) throw notFound('Invoice not found');
    return inv;
};

export interface KoalInvoiceCreateInput {
    invoiceNumber: string;
    invoiceDate: unknown;
    clientId: unknown;
    invoiceByInfluencerId: string;
    lineItems: unknown;
    amountPayable: unknown;
    currency?: unknown;
    paymentDetails: unknown;
    bankAccountHolderName?: unknown;
    bankName?: unknown;
    bankAccountNumberOrIban?: unknown;
    bankSwiftOrIfsc?: unknown;
    bankCountry?: unknown;
    cryptoChainAddress?: unknown;
    cryptoWalletAddress?: unknown;
}

function paymentFieldsFromBody(body: KoalInvoiceCreateInput, paymentDetails: KoalInvoicePaymentDetails) {
    const bankAccountHolderName =
        typeof body.bankAccountHolderName === 'string' ? body.bankAccountHolderName.trim() || null : null;
    const bankName = typeof body.bankName === 'string' ? body.bankName.trim() || null : null;
    const bankAccountNumberOrIban =
        typeof body.bankAccountNumberOrIban === 'string' ? body.bankAccountNumberOrIban.trim() || null : null;
    const bankSwiftOrIfsc = typeof body.bankSwiftOrIfsc === 'string' ? body.bankSwiftOrIfsc.trim() || null : null;
    const bankCountry = typeof body.bankCountry === 'string' ? body.bankCountry.trim() || null : null;
    const cryptoChainAddress =
        typeof body.cryptoChainAddress === 'string' ? body.cryptoChainAddress.trim() || null : null;
    const cryptoWalletAddress =
        typeof body.cryptoWalletAddress === 'string' ? body.cryptoWalletAddress.trim() || null : null;

    validatePaymentPayload(paymentDetails, {
        bankAccountHolderName,
        bankName,
        bankAccountNumberOrIban,
        bankSwiftOrIfsc,
        bankCountry,
    }, { cryptoChainAddress, cryptoWalletAddress });

    if (paymentDetails === KOAL_INVOICE_PAYMENT_BANK) {
        return {
            bankAccountHolderName,
            bankName,
            bankAccountNumberOrIban,
            bankSwiftOrIfsc,
            bankCountry,
            cryptoChainAddress: null,
            cryptoWalletAddress: null,
        };
    }
    return {
        bankAccountHolderName: null,
        bankName: null,
        bankAccountNumberOrIban: null,
        bankSwiftOrIfsc: null,
        bankCountry: null,
        cryptoChainAddress,
        cryptoWalletAddress,
    };
}

export const createKoalInvoice = async (body: KoalInvoiceCreateInput): Promise<KoalInvoice> => {
    const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    if (!invoiceNumber) throw badRequest('invoiceNumber is required');

    if (!isKoalInvoicePaymentDetails(body.paymentDetails)) {
        throw badRequest('paymentDetails must be "bank" or "crypto"');
    }
    const paymentDetails = body.paymentDetails;

    const invoiceByInfluencerId = typeof body.invoiceByInfluencerId === 'string' ? body.invoiceByInfluencerId.trim() : '';
    if (!invoiceByInfluencerId) {
        throw badRequest('invoiceByInfluencerId is required');
    }

    await assertInfluencerExists(invoiceByInfluencerId);

    const clientId = normalizeClientId(body.clientId);
    await assertClientExists(clientId);

    const currency = resolveKoalInvoiceCurrency(body.currency);
    const lineItems = normalizeLineItems(body.lineItems);

    const repo = AppDataSource.getRepository(KoalInvoice);
    await assertInvoiceNumberAvailable(invoiceNumber);

    const paymentCols = paymentFieldsFromBody(body, paymentDetails);

    const entity = repo.create({
        invoiceNumber,
        invoiceDate: parseInvoiceDate(body.invoiceDate),
        clientId,
        currency,
        invoiceByInfluencerId,
        lineItems,
        amountPayable: normalizeAmountPayable(body.amountPayable),
        paymentDetails,
        ...paymentCols,
        status: KOAL_INVOICE_STATUS_UNPAID,
        utr: null,
        isDeleted: false,
    });

    let saved: KoalInvoice;
    try {
        saved = await repo.save(entity);
    } catch (error: unknown) {
        rethrowIfInvoiceNumberConflict(error);
    }
    const full = await repo.findOne({
        where: { id: saved.id },
        relations: ['invoiceByInfluencer', 'client'],
    });
    if (!full) throw notFound('Invoice not found after create');
    return full;
};

export type KoalInvoiceUpdateInput = Partial<KoalInvoiceCreateInput> & {
    /** `unpaid` | `paid` — when `paid`, `utr` must be provided (same request or already stored). */
    status?: unknown;
    /** Payment reference (UTR / transaction id); required when setting `status` to `paid`. Cleared when `unpaid`. */
    utr?: unknown;
};

function applyInvoiceStatusAndUtr(existing: KoalInvoice, body: KoalInvoiceUpdateInput): void {
    let nextStatus: KoalInvoiceStatus = existing.status ?? KOAL_INVOICE_STATUS_UNPAID;
    let nextUtr: string | null = existing.utr ?? null;

    if (body.status !== undefined) {
        if (!isKoalInvoiceStatus(body.status)) {
            throw badRequest('status must be "unpaid" or "paid"');
        }
        nextStatus = body.status;
    }
    if (body.utr !== undefined) {
        if (body.utr === null) {
            nextUtr = null;
        } else if (typeof body.utr === 'string') {
            nextUtr = body.utr.trim() || null;
        } else {
            throw badRequest('utr must be a string or null');
        }
    }

    if (nextStatus === KOAL_INVOICE_STATUS_UNPAID) {
        nextUtr = null;
    } else if (!nextUtr?.trim()) {
        throw badRequest('utr is required when marking the invoice as paid');
    }

    existing.status = nextStatus;
    existing.utr = nextUtr;
}

export const updateKoalInvoice = async (id: string, body: KoalInvoiceUpdateInput): Promise<KoalInvoice> => {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const existing = await repo.findOne({ where: { id, isDeleted: false } });
    if (!existing) throw notFound('Invoice not found');

    if (body.invoiceNumber !== undefined) {
        const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
        if (!invoiceNumber) throw badRequest('invoiceNumber cannot be empty');
        await assertInvoiceNumberAvailable(invoiceNumber, id);
        existing.invoiceNumber = invoiceNumber;
    }
    if (body.invoiceDate !== undefined) {
        existing.invoiceDate = parseInvoiceDate(body.invoiceDate);
    }
    if (body.invoiceByInfluencerId !== undefined) {
        const v = typeof body.invoiceByInfluencerId === 'string' ? body.invoiceByInfluencerId.trim() : '';
        if (!v) throw badRequest('invoiceByInfluencerId cannot be empty');
        await assertInfluencerExists(v);
        existing.invoiceByInfluencerId = v;
    }
    if (body.clientId !== undefined) {
        const v = normalizeClientId(body.clientId);
        await assertClientExists(v);
        existing.clientId = v;
    }
    if (body.currency !== undefined) {
        existing.currency = resolveKoalInvoiceCurrency(body.currency);
    }
    if (body.lineItems !== undefined) {
        existing.lineItems = normalizeLineItems(body.lineItems);
    }
    if (body.amountPayable !== undefined) {
        existing.amountPayable = normalizeAmountPayable(body.amountPayable);
    }

    const paymentDetailsNext: KoalInvoicePaymentDetails =
        body.paymentDetails !== undefined
            ? isKoalInvoicePaymentDetails(body.paymentDetails)
                ? body.paymentDetails
                : (() => {
                      throw badRequest('paymentDetails must be "bank" or "crypto"');
                  })()
            : existing.paymentDetails;

    if (body.paymentDetails !== undefined) {
        existing.paymentDetails = paymentDetailsNext;
    }

    const mergedForValidation: KoalInvoiceCreateInput = {
        invoiceNumber: existing.invoiceNumber,
        invoiceDate: existing.invoiceDate,
        clientId: existing.clientId,
        invoiceByInfluencerId: existing.invoiceByInfluencerId,
        lineItems: existing.lineItems,
        amountPayable: existing.amountPayable,
        paymentDetails: paymentDetailsNext,
        bankAccountHolderName: body.bankAccountHolderName ?? existing.bankAccountHolderName,
        bankName: body.bankName ?? existing.bankName,
        bankAccountNumberOrIban: body.bankAccountNumberOrIban ?? existing.bankAccountNumberOrIban,
        bankSwiftOrIfsc: body.bankSwiftOrIfsc ?? existing.bankSwiftOrIfsc,
        bankCountry: body.bankCountry ?? existing.bankCountry,
        cryptoChainAddress: body.cryptoChainAddress ?? existing.cryptoChainAddress,
        cryptoWalletAddress: body.cryptoWalletAddress ?? existing.cryptoWalletAddress,
    };

    const paymentCols = paymentFieldsFromBody(mergedForValidation, paymentDetailsNext);
    Object.assign(existing, paymentCols);

    applyInvoiceStatusAndUtr(existing, body);

    try {
        await repo.save(existing);
    } catch (error: unknown) {
        rethrowIfInvoiceNumberConflict(error);
    }
    const full = await repo.findOne({
        where: { id },
        relations: ['invoiceByInfluencer', 'client'],
    });
    if (!full) throw notFound('Invoice not found after update');
    return full;
};

function parsePaymentUtrFromMarkPaidBody(body: unknown): string {
    if (!body || typeof body !== 'object') {
        throw badRequest('payment_utr is required');
    }
    const rec = body as Record<string, unknown>;
    const raw = rec.payment_utr ?? rec.paymentUtr ?? rec.utr;
    if (typeof raw !== 'string' || !raw.trim()) {
        throw badRequest('payment_utr is required (non-empty string)');
    }
    return raw.trim();
}

/**
 * Mark a kol invoice as **paid** using only a payment reference (`payment_utr` in the JSON body).
 * Idempotent: if the invoice is already `paid` with the same UTR, returns the invoice unchanged.
 */
export const markKoalInvoicePaidWithUtr = async (id: string, body: unknown): Promise<KoalInvoice> => {
    const utr = parsePaymentUtrFromMarkPaidBody(body);
    const repo = AppDataSource.getRepository(KoalInvoice);
    const existing = await repo.findOne({ where: { id, isDeleted: false } });
    if (!existing) throw notFound('Invoice not found');

    if (existing.status === KOAL_INVOICE_STATUS_PAID) {
        const existingUtr = existing.utr?.trim() ?? '';
        if (existingUtr === utr) {
            const full = await repo.findOne({
                where: { id },
                relations: ['invoiceByInfluencer', 'client'],
            });
            if (!full) throw notFound('Invoice not found');
            return full;
        }
        throw badRequest('Invoice is already marked as paid with a different payment reference');
    }

    existing.status = KOAL_INVOICE_STATUS_PAID;
    existing.utr = utr;
    await repo.save(existing);

    const full = await repo.findOne({
        where: { id },
        relations: ['invoiceByInfluencer', 'client'],
    });
    if (!full) throw notFound('Invoice not found after update');
    return full;
};

export const deleteKoalInvoice = async (id: string): Promise<void> => {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const existing = await repo.findOne({ where: { id, isDeleted: false } });
    if (!existing) throw notFound('Invoice not found');
    existing.isDeleted = true;
    await repo.save(existing);
};
