import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import HttpStatus from 'http-status-codes';
import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Client } from '../../../entity/client.entity';
import { KoalInvoice } from '../../../entity/koal-invoice.entity';
import { KOAL_INVOICE_PAYMENT_BANK, KOAL_INVOICE_STATUS_PAID, KOAL_INVOICE_PDF_COMPANY_BRAND } from '../../../constants/koal-invoice';

const TEMPLATE_NAME = 'koalInvoice.ejs';

function getTemplatePath(): string {
    return path.join(process.cwd(), 'src', 'templates', TEMPLATE_NAME);
}

export interface KoalInvoicePdfProjectRow {
    clientName: string;
    amountDisplay: string;
}

export interface KoalInvoicePdfViewData {
    companyBrand: string;
    invoiceNumber: string;
    invoiceDateDisplay: string;
    issuedDateLong: string;
    fromName: string;
    fromDesignation: string;
    invoiceByName: string;
    showOnBehalf: boolean;
    billToName: string;
    billToAddress: string;
    billToEmail: string;
    billToPhone: string;
    billToWebsite: string;
    deliverables: string[];
    projectRows: KoalInvoicePdfProjectRow[];
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

async function buildViewData(invoice: KoalInvoice): Promise<KoalInvoicePdfViewData> {
    const fromInf = invoice.fromInfluencer;
    const byInf = invoice.invoiceByInfluencer;
    if (!fromInf || !byInf) {
        const err = new Error('Invoice is missing influencer relations');
        (err as Error & { status: number }).status = HttpStatus.INTERNAL_SERVER_ERROR;
        throw err;
    }

    const fromDesignation = fromInf.platform?.trim() ? String(fromInf.platform).trim() : '—';

    const clientIds = [...new Set(invoice.projects.map((p) => p.clientId))];
    const clientRepo = AppDataSource.getRepository(Client);
    const clients =
        clientIds.length > 0
            ? await clientRepo.find({
                  where: { id: In(clientIds), isDeleted: false },
                  relations: ['billingInfo'],
              })
            : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const projectRows: KoalInvoicePdfProjectRow[] = invoice.projects.map((p) => {
        const c = clientMap.get(p.clientId);
        const name = c?.name?.trim() ? c.name.trim() : `Client (${p.clientId.slice(0, 8)}…)`;
        const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount));
        const amountDisplay = Number.isFinite(amt) ? amt.toFixed(2) : String(p.amount);
        return { clientName: name, amountDisplay };
    });

    const invDate = invoice.invoiceDate;
    const invoiceDateDisplay =
        typeof invDate === 'string' && invDate.length >= 10 ? invDate.slice(0, 10) : String(invDate);
    const issuedDateLong = formatIsoDateUtcLong(invoiceDateDisplay);

    const deliverables = invoice.deliverables.map((d) => String(d));

    const uniqueClientCount = clientIds.length;
    const primaryClientId = invoice.projects[0]?.clientId;
    const primaryClient = primaryClientId ? clientMap.get(primaryClientId) : undefined;

    let billToName = '—';
    let billToAddress = '—';
    let billToEmail = '—';
    let billToPhone = '—';
    let billToWebsite = '—';
    if (uniqueClientCount === 1 && primaryClient) {
        billToName = dashIfEmpty(primaryClient.name || '');
        billToEmail = dashIfEmpty(primaryClient.email || '');
        billToWebsite = dashIfEmpty(primaryClient.website || '');
        billToPhone = dashIfEmpty(primaryClient.whatsAppNumber || '');
        const addr = primaryClient.billingInfo?.registeredCompanyAddress?.trim();
        billToAddress = addr && addr.length > 0 ? addr : '—';
    } else if (uniqueClientCount > 1) {
        billToName = 'Multiple clients (see line items)';
        billToEmail = primaryClient ? dashIfEmpty(primaryClient.email || '') : '—';
        billToAddress = '—';
        billToPhone = primaryClient ? dashIfEmpty(primaryClient.whatsAppNumber || '') : '—';
        billToWebsite = primaryClient ? dashIfEmpty(primaryClient.website || '') : '—';
    }

    const ap = parseFloat(String(invoice.amountPayable));
    const amountPayableDisplay = Number.isFinite(ap) ? ap.toFixed(2) : String(invoice.amountPayable);

    const paymentIsBank = invoice.paymentDetails === KOAL_INVOICE_PAYMENT_BANK;
    const paymentMethodLabel = paymentIsBank ? 'Bank transfer (EFT / wire)' : 'Cryptocurrency';
    const isPaid = invoice.status === KOAL_INVOICE_STATUS_PAID;
    const utrTrim = invoice.utr?.trim() || '';

    const showOnBehalf = fromInf.id !== byInf.id;

    return {
        companyBrand: KOAL_INVOICE_PDF_COMPANY_BRAND,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDateDisplay,
        issuedDateLong,
        fromName: fromInf.name?.trim() || 'Influencer',
        fromDesignation,
        invoiceByName: byInf.name?.trim() || 'Influencer',
        showOnBehalf,
        billToName,
        billToAddress,
        billToEmail,
        billToPhone,
        billToWebsite,
        deliverables,
        projectRows,
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
 * Generate a PDF buffer and suggested filename for a Koal invoice.
 */
export async function generateKoalInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const repo = AppDataSource.getRepository(KoalInvoice);
    const invoice = await repo.findOne({
        where: { id: invoiceId, isDeleted: false },
        relations: ['fromInfluencer', 'invoiceByInfluencer'],
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
