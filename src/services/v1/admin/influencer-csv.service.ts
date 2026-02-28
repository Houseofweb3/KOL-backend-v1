import { Readable } from 'stream';
import csv from 'csv-parser';
import { createInfluencer, type CreateInfluencerData } from './influencer.service';

/**
 * CSV column headers for influencer intake (Ampli5-style).
 * Maps to Influencer entity fields. Use exact header names in CSV.
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
    'Buy Price': 'buyPrice',
    'Sell Price': 'sellPrice',
    'Price': 'sellPrice',
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

/**
 * Map a single CSV row to influencer create payload.
 * Supports both "Channel / Brand Name" and "Name"; "Primary Contact Email" and "Email".
 * If name looks like a URL with @ (e.g. youtube.com/@handle), the part after @ is used as name.
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

    const sellPrice = raw['Sell Price'] ?? raw['Price'] ?? null;
    return {
        name,
        email,
        telegramId: raw['Telegram ID'] ?? null,
        whatsAppNumber: raw['WhatsApp Number'] ?? null,
        primaryCountry: raw['Primary Country'] ?? null,
        primaryTimezone: raw['Primary Timezone'] ?? null,
        platform: raw['Platform'] ?? null,
        platformLink: raw['Platform Link'] ?? null,
        inventory: raw['Inventory'] ?? null,
        buyPrice: raw['Buy Price'] ?? null,
        sellPrice,
        cpm: raw['CPM'] ?? null,
        avgViews: raw['Avg Views'] ?? null,
        industries: raw['Industries'] ?? null,
        categories: raw['Categories'] ?? null,
        primaryAudienceGeography: raw['Primary Audience Geography'] ?? null,
        secondaryAudienceGeography: raw['Secondary Audience Geography'] ?? null,
        ageScreenshotUrl: raw['Age Screenshot URL'] ?? null,
        genderScreenshotUrl: raw['Gender Screenshot URL'] ?? null,
        topCountriesScreenshotUrl: raw['Top Countries Screenshot URL'] ?? null,
        paymentTerms: raw['Payment Terms'] ?? null,
        turnaroundTimes: raw['Turnaround Times'] ?? null,
        firstCollaborationImage1: raw['First Collaboration Image 1'] ?? null,
        firstCollaborationImage2: raw['First Collaboration Image 2'] ?? null,
        firstCollaborationImage3: raw['First Collaboration Image 3'] ?? null,
        xLink: raw['X Link'] ?? null,
        instagramLink: raw['Instagram Link'] ?? null,
        youtubeLink: raw['YouTube Link'] ?? null,
        tiktokLink: raw['TikTok Link'] ?? null,
        newsletterLink: raw['Newsletter Link'] ?? null,
        finalConfirmation: toBool(row['Final Confirmation']),
        isVerified: false,
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
