import { Readable } from 'stream';
import csv from 'csv-parser';
import { createClient } from './client.service';

/**
 * CSV column headers from Ampli5 brand-intake-form (exact match).
 * Maps to Client entity fields.
 */
export const CSV_CLIENT_HEADER_MAP: Record<string, string> = {
    'Brand Product Name': 'name',
    'Primary Contact Email': 'email',
    'Website Link': 'website',
    'Telegram ID': 'telegramId',
    'WhatsApp Number': 'whatsAppNumber',
    'Categories': 'categories',
    'Campaign Goals': 'campaignGoals',
    'Monetization Model': 'monetizationModel',
    'Primary Audience Geography': 'primaryAudienceGeography',
    'Age Range': 'ageRange',
    'Gender Skew': 'genderSkew',
    'Campaign Start Timeline': 'campaignStartTimeline',
    'Custom Brief': 'customBrief',
};

/** Columns we ignore (not in Client entity). */
const CSV_IGNORED = ['Date', 'Time'];

function trim(val: unknown): string | null {
    if (val == null) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
}

/**
 * Map a single CSV row (with CSV headers as keys) to client create payload.
 * Returns null if name or email is missing.
 */
export function mapCsvRowToClient(row: Record<string, unknown>): {
    name: string;
    email: string;
    website?: string | null;
    telegramId?: string | null;
    whatsAppNumber?: string | null;
    categories?: string | null;
    campaignGoals?: string | null;
    monetizationModel?: string | null;
    primaryAudienceGeography?: string | null;
    ageRange?: string | null;
    genderSkew?: string | null;
    campaignStartTimeline?: string | null;
    customBrief?: string | null;
} | null {
    const raw: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(row)) {
        const key = String(k).trim();
        if (CSV_IGNORED.includes(key)) continue;
        raw[key] = trim(v);
    }
    const name = raw['Brand Product Name'] ?? null;
    const email = raw['Primary Contact Email'] ?? null;
    if (!name || !email) return null;

    return {
        name,
        email,
        website: raw['Website Link'] ?? null,
        telegramId: raw['Telegram ID'] ?? null,
        whatsAppNumber: raw['WhatsApp Number'] ?? null,
        categories: raw['Categories'] ?? null,
        campaignGoals: raw['Campaign Goals'] ?? null,
        monetizationModel: raw['Monetization Model'] ?? null,
        primaryAudienceGeography: raw['Primary Audience Geography'] ?? null,
        ageRange: raw['Age Range'] ?? null,
        genderSkew: raw['Gender Skew'] ?? null,
        campaignStartTimeline: raw['Campaign Start Timeline'] ?? null,
        customBrief: raw['Custom Brief'] ?? null,
    };
}

export interface UploadClientsCsvResult {
    created: number;
    skipped: number;
    errors: { row: number; email?: string; error: string }[];
}

/**
 * Parse CSV buffer (Ampli5 brand-intake-form format) and create clients.
 * Duplicate email -> skip and count. Invalid rows -> errors list.
 */
export async function uploadClientsFromCsv(buffer: Buffer): Promise<UploadClientsCsvResult> {
    const result: UploadClientsCsvResult = { created: 0, skipped: 0, errors: [] };
    const stream = Readable.from(buffer);
    let rowIndex = 0;

    return new Promise((resolve, reject) => {
        const rows: Record<string, unknown>[] = [];
        stream
            .pipe(csv({ skipLines: 0 }))
            .on('data', (row: Record<string, unknown>) => {
                rowIndex++;
                rows.push(row);
            })
            .on('end', async () => {
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const payload = mapCsvRowToClient(row);
                    if (!payload) {
                        const email = trim(row['Primary Contact Email']);
                        if (!trim(row['Brand Product Name']) && !email) continue;
                        result.errors.push({ row: i + 2, email: email ?? undefined, error: 'Missing name or email' });
                        continue;
                    }
                    try {
                        await createClient(payload);
                        result.created++;
                    } catch (err: any) {
                        if (err.status === 409) {
                            result.skipped++;
                        } else {
                            result.errors.push({
                                row: i + 2,
                                email: payload.email,
                                error: err.message || String(err),
                            });
                        }
                    }
                }
                resolve(result);
            })
            .on('error', (err) => reject(err));
    });
}
