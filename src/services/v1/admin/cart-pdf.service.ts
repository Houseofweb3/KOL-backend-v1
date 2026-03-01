import path from 'path';
import fs from 'fs';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';

/** Base folder for platform icon SVGs (paths in PLATFORM_MAP are relative to this). */
const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Platform key -> SVG path (relative to public). Add your SVG files under public/socials/ and add entries here.
 */
export const PLATFORM_MAP: { [key: string]: string } = {
    x: '/socials/twitter.svg',
    youtube: '/socials/youtube.svg',
    instagram: '/socials/Instagram.svg',
    tiktok: '/socials/TikTok.svg',
    newsletter: '/socials/news.svg',
    spotify: '/socials/Spotify.svg',
    'pr/editorial': '/socials/pr-editorial.svg',
    podcast: '/socials/Mic.svg',
    telegram: '/socials/telegram.svg',
    'ama/spaces': '/socials/message.svg',
};

/** Use the same template as legacy: full first page (AMPLI5.AI, pitch, overview) + Project Investment + table. */
const TEMPLATE_NAME = 'invoiceTemplate2.0.ejs';

function getTemplatePath(): string {
    return path.join(process.cwd(), 'src', 'templates', TEMPLATE_NAME);
}

/** One row for invoiceTemplate2.0.ejs: influencers item shape. */
export interface InvoiceInfluencer {
    name: string;
    socialMediaLink: string;
    platform: string | null;
    deliverables: string | null;
    profOfWork: string;
    price: string | number;
    quantity: number;
    notes: string | null;
}

/** View data for invoiceTemplate2.0.ejs. */
export interface InvoiceTemplateViewData {
    influencers: InvoiceInfluencer[];
    influencerLength: number;
    totalPrice: string;
    discount: number;
    discountAmount: string;
    totalPriceAfterDiscount: string;
    managementFeePercentage: string;
    managementFee: string;
    totalPriceWithFee: string;
    getPlatformIcon: (platform: string | null) => string;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Normalize platform name to a key in PLATFORM_MAP (lowercase, trim, aliases). Add more aliases here as needed. */
function normalizePlatformKey(platform: string): string {
    const p = String(platform).toLowerCase().trim();
    if (p === 'yt' || p === 'youtube') return 'youtube';
    if (p === 'tw' || p === 'twitter' || p === 'x') return 'x';
    if (p === 'ig' || p === 'insta' || p === 'instagram') return 'instagram';
    if (p === 'tk' || p === 'tiktok') return 'tiktok';
    if (p === 'newsletter' || p === 'news') return 'newsletter';
    if (p === 'spotify') return 'spotify';
    if (p === 'pr editorial' || p === 'pr-editorial' || p === 'preditorial' || p === 'pr/editorial') return 'pr/editorial';
    if (p === 'podcast' || p === 'mic') return 'podcast';
    if (p === 'tg' || p === 'telegram') return 'telegram';
    if (p === 'ama' || p === 'spaces' || p === 'ama/spaces' || p === 'ama spaces') return 'ama/spaces';
    return p.replace(/\s+/g, ' ');
}

/** Load SVG contents from PLATFORM_MAP paths (public dir). Missing files are skipped; key stays absent. */
function loadPlatformIconCache(): Record<string, string> {
    const cache: Record<string, string> = {};
    for (const [key, svgPath] of Object.entries(PLATFORM_MAP)) {
        const fullPath = path.join(PUBLIC_DIR, svgPath.replace(/^\//, ''));
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            cache[key] = content.trim();
        } catch {
            // file missing or unreadable; skip so we fall back to [platform] text
        }
    }
    return cache;
}

/** Build getPlatformIcon that uses pre-loaded SVG cache. Template calls getPlatformIcon(platform). */
function makeGetPlatformIcon(iconCache: Record<string, string>): (platform: string | null) => string {
    return (platform: string | null): string => {
        if (!platform || String(platform).trim() === '') return '';
        const key = normalizePlatformKey(platform);
        const exact = iconCache[key];
        if (exact) {
            return `<span style="display:inline-flex;vertical-align:middle;margin-left:4px;width:20px;height:20px" title="${escapeHtml(platform)}">${exact}</span>`;
        }
        return `<span style="font-size:11px;color:#6b7280;margin-left:4px">[${escapeHtml(platform)}]</span>`;
    };
}

/**
 * Load cart with items and influencers, build view data for invoiceTemplate2.0.ejs.
 * iconCache: platform key -> inline SVG string (from loadPlatformIconCache).
 */
async function getCartProposalData(cartId: string, iconCache: Record<string, string>): Promise<InvoiceTemplateViewData> {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    const cart = await cartRepo.findOne({ where: { id: cartId }, relations: ['client'] });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }

    const allItems = await itemRepo.find({
        where: { cartId: cart.id },
        relations: ['influencer'],
        order: { createdAt: 'ASC' },
    });

    const items = allItems.filter((item) => item.isApproved === true);

    const discountPercent = parseFloat(String(cart.discountPercent ?? '0'));
    const managementFeePercent = parseFloat(String(cart.managementFeePercent ?? '15'));
    const subtotalNum = items.reduce((sum, item) => sum + (item.quantity ?? 1) * parseFloat(String(item.price ?? '0')), 0);
    const discountAmountNum = subtotalNum * (discountPercent / 100);
    const afterDiscount = subtotalNum - discountAmountNum;
    const managementFeeNum = afterDiscount * (managementFeePercent / 100);
    const totalNum = afterDiscount + managementFeeNum;

    const influencers: InvoiceInfluencer[] = items.map((item) => {
        const inf = (item as any).influencer;
        const price = parseFloat(String(item.price ?? '0'));
        const qty = item.quantity ?? 1;
        const proofArr = item.proofOfWork && Array.isArray(item.proofOfWork) ? item.proofOfWork : [];
        const profOfWork = typeof proofArr[0] === 'string' ? proofArr[0] : '';
        return {
            name: inf?.name ?? 'Influencer',
            socialMediaLink: inf?.platformLink?.trim() ? String(inf.platformLink).trim() : '#',
            platform: inf?.platform ?? null,
            deliverables: inf?.inventory ?? null,
            profOfWork,
            price,
            quantity: qty,
            notes: item.notes ?? null,
        };
    });

    const managementFeePercentStr = String(cart.managementFeePercent ?? '15');
    return {
        influencers,
        influencerLength: influencers.length,
        totalPrice: subtotalNum.toFixed(2),
        discount: discountPercent,
        discountAmount: discountAmountNum.toFixed(2),
        totalPriceAfterDiscount: afterDiscount.toFixed(2),
        managementFeePercentage: managementFeePercentStr,
        managementFee: managementFeeNum.toFixed(2),
        totalPriceWithFee: totalNum.toFixed(2),
        getPlatformIcon: makeGetPlatformIcon(iconCache),
    };
}

/**
 * Generate proposal PDF for a cart using invoiceTemplate2.0.ejs.
 * First page: AMPLI5.AI intro (logo, pitch, overview). Second page: Project Investment + influencers table + summary.
 * Returns PDF buffer. Throws with status 404 if cart not found.
 */
export async function generateCartProposalPdf(cartId: string): Promise<Buffer> {
    const iconCache = loadPlatformIconCache();
    const viewData = await getCartProposalData(cartId, iconCache);
    const templatePath = getTemplatePath();

    const html = await ejs.renderFile(templatePath, viewData);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
        return Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult as ArrayBuffer);
    } finally {
        await browser.close();
    }
}
