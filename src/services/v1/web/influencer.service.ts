import { Brackets } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Influencer } from '../../../entity/influencer.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface WebListInfluencersOptions {
    page?: number;
    limit?: number;
    search?: string;
    /** One or more values per filter (e.g. from checkboxes). Match if influencer has any of these. */
    primaryCountry?: string[];
    platform?: string[];
    inventory?: string[];
    industries?: string[];
    categories?: string[];
    primaryAudienceGeography?: string[];
}

export interface WebListInfluencersResult {
    influencers: Influencer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Add OR-where for a text field matching any of the values (ILike). */
function addOrWhereILike(
    qb: ReturnType<ReturnType<typeof AppDataSource.getRepository>['createQueryBuilder']>,
    field: string,
    values: string[],
    paramPrefix: string
) {
    if (values.length === 0) return;
    const params: Record<string, string> = {};
    values.forEach((v, i) => {
        params[`${paramPrefix}${i}`] = `%${v}%`;
    });
    qb.andWhere(
        new Brackets((sub) => {
            values.forEach((_, i) => {
                sub.orWhere(`i.${field} ILike :${paramPrefix}${i}`, params);
            });
        })
    );
}

/** Columns selected for web list (excludes heavy/sensitive fields to reduce DB and payload). */
const WEB_INFLUENCER_SELECT = [
    'i.id',
    'i.name',
    'i.email',
    'i.primaryCountry',
    'i.platform',
    'i.platformLink',
    'i.inventory',
    'i.sellPrice',
    'i.cpm',
    'i.avgViews',
    'i.industries',
    'i.categories',
    'i.primaryAudienceGeography',
    'i.createdAt',

] as const;

/**
 * List influencers for web (no auth). Only non-deleted.
 * Selects only fields needed for list/cards (excludes updatedAt, deletedAt, telegramId, whatsAppNumber,
 * primaryCountry, primaryTimezone, secondaryAudienceGeography, screenshot URLs, paymentTerms, turnaroundTimes,
 * collaboration images, social links, finalConfirmation, isVerified, isDeleted) to reduce load.
 */
export const webListInfluencers = async (
    options: WebListInfluencersOptions = {}
): Promise<WebListInfluencersResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const primaryCountry = options.primaryCountry ?? [];
    const platform = options.platform ?? [];
    const inventory = options.inventory ?? [];
    const industries = options.industries ?? [];
    const categories = options.categories ?? [];
    const primaryAudienceGeography = options.primaryAudienceGeography ?? [];

    const repo = AppDataSource.getRepository(Influencer);
    const qb = repo
        .createQueryBuilder('i')
        .select(WEB_INFLUENCER_SELECT as any)
        .where('i.isDeleted = :isDeleted', { isDeleted: false })
        .orderBy('i.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    addOrWhereILike(qb, 'primaryCountry', primaryCountry, 'webPrimaryCountry');
    addOrWhereILike(qb, 'platform', platform, 'webPlatform');
    addOrWhereILike(qb, 'inventory', inventory, 'webInventory');
    addOrWhereILike(qb, 'industries', industries, 'webIndustries');
    addOrWhereILike(qb, 'categories', categories, 'webCategories');
    addOrWhereILike(qb, 'primaryAudienceGeography', primaryAudienceGeography, 'webPrimaryAudienceGeography');
    if (search) {
        qb.andWhere(
            '(i.name ILike :search OR i.email ILike :search OR i.telegramId ILike :search)',
            { search: `%${search}%` }
        );
    }

    const [influencers, total] = await qb.getManyAndCount();
    return { influencers, total, page, limit, totalPages: Math.ceil(total / limit) };
};
