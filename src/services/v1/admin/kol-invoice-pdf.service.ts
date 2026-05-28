import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Client } from '../../../entity/client.entity';
import { KoalInvoice } from '../../../entity/kol-invoice.entity';
import {
    getKoalInvoiceCurrencyDisplayName,
    getKoalInvoiceCurrencySymbol,
    KOAL_INVOICE_PAYMENT_BANK,
    KOAL_INVOICE_STATUS_PAID,
    KOAL_INVOICE_PDF_COMPANY_BRAND,
} from '../../../constants/kol-invoice';

const TEMPLATE_NAME = 'kolInvoice.ejs';

function getTemplatePath(): string {
    return path.join(process.cwd(), 'src', 'templates', TEMPLATE_NAME);
}

export interface KoalInvoicePdfLineRow {
    deliverable: string;
    amountDisplay: string;
}

export interface KoalInvoicePdfViewData {
    companyBrand: string;
    invoiceNumber: string;
    invoiceDateDisplay: string;
    issuedDateLong: string;
    currencyCode: string;
    currencyDisplayName: string;
    currencySymbol: string;
    invoiceByName: string;
    invoiceByPlatform: string;
    billToName: string;
    billToAddress: string;
    billToEmail: string;
    billToPhone: string;
    billToWebsite: string;
    lineRows: KoalInvoicePdfLineRow[];
    amountPayableDisplay: string;
    paymentIsBank: boolean;
    paymentMethodLabel: string;
    bankAccountHolderName: string;
    bankName: string;
    bankAccountNumberOrIban: string;
    bankSwiftOrIfsc: string;
    bankCountry: string;
    cryptoChainAddress: string;
    cryptoWalletAddress: string;
    statusLabel: string;
    paymentIsPaid: boolean;
    showUtrRow: boolean;
    utrDisplay: string;
    invoiceByEmail: string;
    invoiceByPhone: string;
    invoiceByPlatformLink: string;
}

function notFound(): Error {
    const err = new Error('Invoice not found');
    (err as Error & { status: number }).status = HttpStatus.NOT_FOUND;
    return err;
}

function safeFilenamePart(s: string): string {
    return String(s)
        .trim()
        .replace(/[\r\n"/\\<>|?*]+/g, '-')
        .slice(0, 80) || 'invoice';
}

function formatIsoDateUtcLong(isoYmd: string): string {
    const d = new Date(`${isoYmd}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return isoYmd;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function dashIfEmpty(s: string): string {
    const t = s.trim();
    return t.length > 0 ? t : '—';
}

async function loadClientWithBilling(clientId: string): Promise<Client | null> {
    const clientRepo = AppDataSource.getRepository(Client);
    return clientRepo.findOne({
        where: { id: clientId, isDeleted: false },
        relations: ['billingInfo'],
    });
}

async function buildViewData(invoice: KoalInvoice): Promise<KoalInvoicePdfViewData> {
    const byInf = invoice.invoiceByInfluencer;
    if (!byInf) {
        const err = new Error('Invoice is missing invoice-by influencer relation');
        (err as Error & { status: number }).status = HttpStatus.INTERNAL_SERVER_ERROR;
        throw err;
    }

    const invoiceByPlatform = byInf.platform?.trim() ? String(byInf.platform).trim() : '—';

    const currencyCode = invoice.currency ?? 'USD';
    const currencySymbol = getKoalInvoiceCurrencySymbol(currencyCode);
    const currencyDisplayName = getKoalInvoiceCurrencyDisplayName(currencyCode);

    const billToClient =
        invoice.client ??
        (invoice.clientId ? await loadClientWithBilling(invoice.clientId) : null);

    const safeLineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    const lineRows: KoalInvoicePdfLineRow[] = safeLineItems.map((item) => {
        const amt = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount));
        const amountDisplay = Number.isFinite(amt) ? amt.toFixed(2) : String(item.amount);
        return { deliverable: String(item.deliverable), amountDisplay };
    });

    const invDate = invoice.invoiceDate;
    const invoiceDateDisplay =
        typeof invDate === 'string' && invDate.length >= 10 ? invDate.slice(0, 10) : String(invDate);
    const issuedDateLong = formatIsoDateUtcLong(invoiceDateDisplay);

    let billToName = '—';
    let billToAddress = '—';
    let billToEmail = '—';
    let billToPhone = '—';
    let billToWebsite = '—';
    if (billToClient) {
        billToName = dashIfEmpty(billToClient.name || '');
        billToEmail = dashIfEmpty(billToClient.email || '');
        billToWebsite = dashIfEmpty(billToClient.website || '');
        billToPhone = dashIfEmpty(billToClient.whatsAppNumber || '');
        const addr = billToClient.billingInfo?.registeredCompanyAddress?.trim();
        billToAddress = addr && addr.length > 0 ? addr : '—';
    }

    const ap = parseFloat(String(invoice.amountPayable));
    const amountPayableDisplay = Number.isFinite(ap) ? ap.toFixed(2) : String(invoice.amountPayable);

    const paymentIsBank = invoice.paymentDetails === KOAL_INVOICE_PAYMENT_BANK;
    const paymentMethodLabel = paymentIsBank ? 'Bank transfer (EFT / wire)' : 'Cryptocurrency';
    const isPaid = invoice.status === KOAL_INVOICE_STATUS_PAID;
    const utrTrim = invoice.utr?.trim() || '';

    return {
        companyBrand: KOAL_INVOICE_PDF_COMPANY_BRAND,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDateDisplay,
        issuedDateLong,
        currencyCode,
        currencyDisplayName,
        currencySymbol,
        invoiceByName: byInf.name?.trim() || 'Influencer',
        invoiceByPlatform,
        billToName,
        billToAddress,
        billToEmail,
        billToPhone,
        billToWebsite,
        lineRows,
        amountPayableDisplay,
        paymentIsBank,
        paymentMethodLabel,
        bankAccountHolderName: invoice.bankAccountHolderName?.trim() || '',
        bankName: invoice.bankName?.trim() || '',
        bankAccountNumberOrIban: invoice.bankAccountNumberOrIban?.trim() || '',
        bankSwiftOrIfsc: invoice.bankSwiftOrIfsc?.trim() || '',
        bankCountry: invoice.bankCountry?.trim() || '',
        cryptoChainAddress: invoice.cryptoChainAddress?.trim() || '',
        cryptoWalletAddress: invoice.cryptoWalletAddress?.trim() || '',
        statusLabel: isPaid ? 'Paid' : 'Unpaid',
        paymentIsPaid: isPaid,
        showUtrRow: isPaid,
        utrDisplay: utrTrim || '—',
        invoiceByEmail: dashIfEmpty(byInf.email || ''),
        invoiceByPhone: dashIfEmpty(byInf.whatsAppNumber || ''),
        invoiceByPlatformLink: dashIfEmpty(byInf.platformLink || ''),
    };
}

/**
 * Generate a PDF buffer and suggested filename for a kol invoice.
 */
export async function generateKoalInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const invoice = await repo.findOne({
        where: { id: invoiceId, isDeleted: false },
        relations: ['invoiceByInfluencer', 'client', 'client.billingInfo'],
    });
    if (!invoice) throw notFound();

    const viewData = await buildViewData(invoice);
    const templatePath = getTemplatePath();
    const html = await ejs.renderFile(templatePath, viewData);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 15000,
        });
        const pdfResult = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        });
        const buffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult as ArrayBuffer);
        const filename = `invoice-${safeFilenamePart(invoice.invoiceNumber)}.pdf`;
        return { buffer, filename };
    } finally {
        await browser.close();
    }
}
