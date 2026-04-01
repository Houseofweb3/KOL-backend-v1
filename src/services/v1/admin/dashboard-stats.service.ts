import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { Client } from '../../../entity/client.entity';
import { Influencer } from '../../../entity/influencer.entity';
import { CartStatus } from '../../../constants/cart';
import {
    INDUSTRY_CATEGORY_OPTIONS,
    PLATFORM_INVENTORY_OPTIONS,
} from '../../../constants/creator-onboarding-options';

export interface CountBucket {
    key: string;
    count: number;
}

export interface AdminDashboardStats {
    generatedAt: string;
    influencers: {
        total: number;
        byPlatform: CountBucket[];
        byIndustry: CountBucket[];
    };
    proposals: {
        total: number;
        byStatus: Record<string, number>;
    };
    clients: {
        total: number;
    };
}

function parseCount(raw: unknown): number {
    const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    return Number.isFinite(n) ? n : 0;
}

/** Case-insensitive match for merging DB labels with canonical onboarding keys. */
function normLabel(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Parent industries first, then subcategories, deduped by normalized label (order preserved). */
function orderedCanonicalIndustryKeys(): string[] {
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const parent of Object.keys(INDUSTRY_CATEGORY_OPTIONS)) {
        const n = normLabel(parent);
        if (!seen.has(n)) {
            seen.add(n);
            keys.push(parent);
        }
    }
    for (const children of Object.values(INDUSTRY_CATEGORY_OPTIONS)) {
        for (const c of children) {
            const n = normLabel(c);
            if (!seen.has(n)) {
                seen.add(n);
                keys.push(c);
            }
        }
    }
    return keys;
}

interface RawCountRow {
    key: string;
    count: string;
}

/**
 * Every canonical key appears with count ≥ 0. DB rows are merged by normalized label.
 * Optional trailing label (e.g. Unknown) also always included with 0 if absent.
 * Any DB-only labels are appended after, sorted by count desc.
 */
function buildBucketsWithCanonicalFirst(
    canonicalKeysInOrder: string[],
    dbRows: RawCountRow[],
    options: { trailingExtraLabel?: string },
): CountBucket[] {
    const normToCount = new Map<string, number>();
    const normToDisplay = new Map<string, string>();

    for (const r of dbRows) {
        const n = normLabel(r.key);
        normToCount.set(n, (normToCount.get(n) ?? 0) + parseCount(r.count));
        if (!normToDisplay.has(n)) {
            normToDisplay.set(n, r.key.trim() || r.key);
        }
    }

    const consumedNorms = new Set<string>();
    const out: CountBucket[] = [];

    for (const can of canonicalKeysInOrder) {
        const n = normLabel(can);
        consumedNorms.add(n);
        out.push({ key: can, count: normToCount.get(n) ?? 0 });
    }

    if (options.trailingExtraLabel) {
        const n = normLabel(options.trailingExtraLabel);
        consumedNorms.add(n);
        out.push({ key: options.trailingExtraLabel, count: normToCount.get(n) ?? 0 });
    }

    const extras: CountBucket[] = [];
    for (const [n, cnt] of normToCount) {
        if (!consumedNorms.has(n)) {
            extras.push({ key: normToDisplay.get(n) ?? n, count: cnt });
            consumedNorms.add(n);
        }
    }
    extras.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    return [...out, ...extras];
}

/**
 * Aggregated read-only stats for admin dashboard (influencers, proposals/carts, clients).
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const influencerRepo = AppDataSource.getRepository(Influencer);
    const cartRepo = AppDataSource.getRepository(Cart);
    const clientRepo = AppDataSource.getRepository(Client);

    const [influencerTotal, clientTotal, proposalTotal] = await Promise.all([
        influencerRepo.count({ where: { isDeleted: false } }),
        clientRepo.count({ where: { isDeleted: false } }),
        cartRepo.count(),
    ]);

    const platformRows = await influencerRepo
        .createQueryBuilder('i')
        .select(`COALESCE(NULLIF(TRIM(i.platform), ''), 'Unknown')`, 'platform')
        .addSelect('COUNT(*)', 'count')
        .where('i.isDeleted = :deleted', { deleted: false })
        .groupBy(`COALESCE(NULLIF(TRIM(i.platform), ''), 'Unknown')`)
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ platform: string; count: string }>();

    const byPlatform = buildBucketsWithCanonicalFirst(
        Object.keys(PLATFORM_INVENTORY_OPTIONS),
        platformRows.map((r) => ({ key: r.platform, count: r.count })),
        { trailingExtraLabel: 'Unknown' },
    );

    const industryRowsFixed = await AppDataSource.query<Array<{ industry: string; count: string }>>(
        `
        SELECT industry, COUNT(*)::text AS count
        FROM (
          SELECT TRIM(BOTH FROM unnest(string_to_array(COALESCE(i.industries, ''), ','))) AS industry
          FROM influencers i
          WHERE i.is_deleted = false
            AND i.industries IS NOT NULL
            AND TRIM(i.industries) <> ''
        ) AS expanded
        WHERE TRIM(BOTH FROM industry) <> ''
        GROUP BY industry
        ORDER BY COUNT(*) DESC
        `,
    );

    const byIndustry = buildBucketsWithCanonicalFirst(
        orderedCanonicalIndustryKeys(),
        industryRowsFixed.map((r) => ({ key: r.industry, count: r.count })),
        {},
    );

    const statusRows = await cartRepo
        .createQueryBuilder('c')
        .select('c.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.status')
        .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(CartStatus)) {
        byStatus[s] = 0;
    }
    for (const row of statusRows) {
        if (row.status) {
            byStatus[row.status] = parseCount(row.count);
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        influencers: {
            total: influencerTotal,
            byPlatform,
            byIndustry,
        },
        proposals: {
            total: proposalTotal,
            byStatus,
        },
        clients: {
            total: clientTotal,
        },
    };
}
