import { Readable } from 'stream';
import csv from 'csv-parser';
import { createInfluencer, sellingPriceFromBuyingPrice, stripPriceToNumeric, type CreateInfluencerData } from './influencer.service';

/**
 * CSV column headers for influencer intake. Maps to Influencer entity.
 * Price from CSV → stored as buyPrice (numeric only); sellPrice = buyPrice + 16% rounded to nearest 100.
 */
export const CSV_INFLUENCER_HEADER_MAP: Record<string, string> = {
    'Channel / Brand Name': 'name',
    'Primary Contact Email': 'email',
    'Telegram ID': 'telegramId',
    'WhatsApp Number': 'whatsAppNumber',
    'Primary Country': 'primaryCountry',
    'Primary Timezone': 'primaryTimezone',
    'Platform': 'platform',
    'Platform Link': 'platformLink',
    'Inventory': 'inventory',
    'Price': 'buyPrice',
    'Buy Price': 'buyPrice',
    'Sell Price': 'sellPrice',
    'CPM': 'cpm',
    'Avg Views': 'avgViews',
    'Industries': 'industries',
    'Categories': 'categories',
    'Primary Audience Geography': 'primaryAudienceGeography',
    'Secondary Audience Geography': 'secondaryAudienceGeography',
    'Age Screenshot URL': 'ageScreenshotUrl',
    'Gender Screenshot URL': 'genderScreenshotUrl',
    'Top Countries Screenshot URL': 'topCountriesScreenshotUrl',
    'Payment Terms': 'paymentTerms',
    'Turnaround Times': 'turnaroundTimes',
    'First Collaboration Image 1': 'firstCollaborationImage1',
    'First Collaboration Image 2': 'firstCollaborationImage2',
    'First Collaboration Image 3': 'firstCollaborationImage3',
    'X Link': 'xLink',
    'Instagram Link': 'instagramLink',
    'YouTube Link': 'youtubeLink',
    'TikTok Link': 'tiktokLink',
    'Newsletter Link': 'newsletterLink',
    'Final Confirmation': 'finalConfirmation',
};

const CSV_IGNORED = ['Date', 'Time'];

function trim(val: unknown): string | null {
    if (val == null) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
}

function toBool(val: unknown): boolean {
    if (val == null) return false;
    const s = String(val).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

/**
 * If the name value is a URL containing @ (e.g. https://www.youtube.com/@buichungreview),
 * use the part after @ as the name (e.g. buichungreview). Otherwise return the value as-is.
 */
function normalizeName(val: string | null): string | null {
    if (val == null) return null;
    const s = val.trim();
    if (s === '') return null;
    if (s.includes('@')) {
        const afterAt = s.split('@').pop()?.trim();
        const name = afterAt?.split('/')[0]?.trim();
        if (name) return name;
    }
    return s;
}

/** Get raw value from row with trimmed key (CSV headers may have trailing tab/newline). */
function getRaw(row: Record<string, string | null>, header: string): string | null {
    const trimmed = header.trim();
    return row[trimmed] ?? null;
}

/**
 * Map a single CSV row to influencer create payload.
 * CSV "Price" → buyPrice (numeric only, $ etc stripped); sellPrice = buyPrice + 16% rounded to nearest 100.
 * Supports "Channel / Brand Name" and "Name"; "Primary Contact Email" and "Email".
 * Returns null if name or email is missing.
 */
export function mapCsvRowToInfluencer(row: Record<string, unknown>): CreateInfluencerData | null {
    const raw: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(row)) {
        const key = String(k).trim();
        if (CSV_IGNORED.includes(key)) continue;
        raw[key] = trim(v);
    }
    const rawName = raw['Channel / Brand Name'] ?? raw['Name'] ?? null;
    const name = normalizeName(rawName);
    const email = raw['Primary Contact Email'] ?? raw['Email'] ?? null;
    if (!name || !email) return null;

    const priceFromCsv = raw['Price'] ?? raw['Buy Price'] ?? null;
    const buyPrice = priceFromCsv != null && priceFromCsv.trim() !== '' ? stripPriceToNumeric(priceFromCsv) : null;
    const sellPrice =
        buyPrice != null
            ? sellingPriceFromBuyingPrice(buyPrice)
            : (raw['Sell Price'] != null && raw['Sell Price'].trim() !== '' ? stripPriceToNumeric(raw['Sell Price']) : null);

    return {
        name,
        email,
        telegramId: getRaw(raw, 'Telegram ID'),
        whatsAppNumber: getRaw(raw, 'WhatsApp Number'),
        primaryCountry: getRaw(raw, 'Primary Country'),
        primaryTimezone: getRaw(raw, 'Primary Timezone'),
        platform: getRaw(raw, 'Platform'),
        platformLink: getRaw(raw, 'Platform Link'),
        inventory: getRaw(raw, 'Inventory'),
        buyPrice,
        sellPrice,
        cpm: getRaw(raw, 'CPM') != null ? stripPriceToNumeric(getRaw(raw, 'CPM')) : null,
        avgViews: getRaw(raw, 'Avg Views'),
        industries: getRaw(raw, 'Industries'),
        categories: getRaw(raw, 'Categories'),
        primaryAudienceGeography: getRaw(raw, 'Primary Audience Geography'),
        secondaryAudienceGeography: getRaw(raw, 'Secondary Audience Geography'),
        ageScreenshotUrl: getRaw(raw, 'Age Screenshot URL'),
        genderScreenshotUrl: getRaw(raw, 'Gender Screenshot URL'),
        topCountriesScreenshotUrl: getRaw(raw, 'Top Countries Screenshot URL'),
        paymentTerms: getRaw(raw, 'Payment Terms'),
        turnaroundTimes: getRaw(raw, 'Turnaround Times'),
        firstCollaborationImage1: getRaw(raw, 'First Collaboration Image 1'),
        firstCollaborationImage2: getRaw(raw, 'First Collaboration Image 2'),
        firstCollaborationImage3: getRaw(raw, 'First Collaboration Image 3'),
        xLink: getRaw(raw, 'X Link'),
        instagramLink: getRaw(raw, 'Instagram Link'),
        youtubeLink: getRaw(raw, 'YouTube Link'),
        tiktokLink: getRaw(raw, 'TikTok Link'),
        newsletterLink: getRaw(raw, 'Newsletter Link'),
        finalConfirmation: toBool(row['Final Confirmation']),
        isVerified: true,
    };
}

export interface UploadInfluencersCsvResult {
    created: number;
    errors: { row: number; email?: string; error: string }[];
}

/**
 * Parse CSV buffer and create one influencer per row. Duplicates allowed (same email allowed).
 */
export async function uploadInfluencersFromCsv(buffer: Buffer): Promise<UploadInfluencersCsvResult> {
    const result: UploadInfluencersCsvResult = { created: 0, errors: [] };

    return new Promise((resolve, reject) => {
        const rows: Record<string, unknown>[] = [];
        const stream = Readable.from(buffer);
        stream
            .pipe(csv({ skipLines: 0 }))
            .on('data', (row: Record<string, unknown>) => rows.push(row))
            .on('end', async () => {
                for (let i = 0; i < rows.length; i++) {
                    const payload = mapCsvRowToInfluencer(rows[i]);
                    if (!payload) {
                        const email = trim(rows[i]['Primary Contact Email'] ?? rows[i]['Email']);
                        const name = trim(rows[i]['Channel / Brand Name'] ?? rows[i]['Name']);
                        if (!name && !email) continue;
                        result.errors.push({
                            row: i + 2,
                            email: email ?? undefined,
                            error: 'Missing name or email',
                        });
                        continue;
                    }
                    try {
                        await createInfluencer(payload);
                        result.created++;
                    } catch (err: any) {
                        result.errors.push({
                            row: i + 2,
                            email: payload.email,
                            error: err.message || String(err),
                        });
                    }
                }
                resolve(result);
            })
            .on('error', (err) => reject(err));
    });
}
