import HttpStatus from 'http-status-codes';
import { Brackets } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Influencer } from '../../../entity/influencer.entity';

const DEFAULT_PAGE = 1;

/** Parse buying/sell price from string or number. Returns null if invalid or empty. */
export function parsePrice(val: string | number | null | undefined): number | null {
    if (val == null) return null;
    const s = String(val).replace(/[$,]/g, '').trim();
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Selling price = buying price + 16%, rounded to nearest 100 (closest 00).
 * e.g. 554 → 554*1.16=642.64 → 600; 549 → 636.84 → 600.
 */
export function calculateSellingPriceFromBuying(buyingPrice: number): number {
    const withMargin = buyingPrice * 1.16;
    return Math.round(withMargin / 100) * 100;
}

/** Apply formula and return sell price as string for entity. If buyingPrice is invalid, returns null. */
export function sellingPriceFromBuyingPrice(buyingPriceInput: string | number | null | undefined): string | null {
    const buying = parsePrice(buyingPriceInput);
    if (buying === null) return null;
    return String(calculateSellingPriceFromBuying(buying));
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface ListInfluencersOptions {
    page?: number;
    limit?: number;
    search?: string;
    /** One or more values per filter (e.g. from checkboxes). Match if influencer has any of these. */
    industries?: string[];
    categories?: string[];
    platform?: string[];
    primaryCountry?: string[];
    inventory?: string[];
    primaryAudienceGeography?: string[];
    includeDeleted?: boolean;
}

export interface ListInfluencersResult {
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

export const listInfluencers = async (options: ListInfluencersOptions = {}): Promise<ListInfluencersResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const industries = options.industries ?? [];
    const categories = options.categories ?? [];
    const platform = options.platform ?? [];
    const primaryCountry = options.primaryCountry ?? [];
    const inventory = options.inventory ?? [];
    const primaryAudienceGeography = options.primaryAudienceGeography ?? [];
    const includeDeleted = options.includeDeleted ?? false;

    const repo = AppDataSource.getRepository(Influencer);
    const qb = repo
        .createQueryBuilder('i')
        .orderBy('i.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    if (!includeDeleted) {
        qb.andWhere('i.isDeleted = :isDeleted', { isDeleted: false });
    }
    addOrWhereILike(qb, 'industries', industries, 'industries');
    addOrWhereILike(qb, 'categories', categories, 'categories');
    addOrWhereILike(qb, 'platform', platform, 'platform');
    addOrWhereILike(qb, 'primaryCountry', primaryCountry, 'primaryCountry');
    addOrWhereILike(qb, 'inventory', inventory, 'inventory');
    addOrWhereILike(qb, 'primaryAudienceGeography', primaryAudienceGeography, 'primaryAudienceGeography');
    if (search) {
        qb.andWhere(
            '(i.name ILike :search OR i.email ILike :search OR i.industries ILike :search OR i.categories ILike :search OR i.platform ILike :search OR i.inventory ILike :search)',
            { search: `%${search}%` }
        );
    }

    const [influencers, total] = await qb.getManyAndCount();
    return { influencers, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/** Minimal influencer for dropdowns (admin cart: select influencer). Pagination, search by name/email, filter by platform (multi). */
export interface InfluencerSelectItem {
    id: string;
    name: string;
    platform: string | null;
    platformLink: string | null;
    inventory: string | null;
    sellPrice: string | null;
    firstCollaborationImage1: string | null;
    firstCollaborationImage2: string | null;
    firstCollaborationImage3: string | null;
    avgViews: string | null;
    cpm: string | null;
    buyPrice: string | null;
}

export interface ListInfluencersForSelectResult {
    influencers: InfluencerSelectItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const listInfluencersForSelect = async (options: {
    page?: number;
    limit?: number;
    search?: string;
    platform?: string[];
} = {}): Promise<ListInfluencersForSelectResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const platformFilter = options.platform ?? [];

    const repo = AppDataSource.getRepository(Influencer);
    const qb = repo
        .createQueryBuilder('i')
        .select([
            'i.id',
            'i.name',
            'i.platform',
            'i.platformLink',
            'i.inventory',
            'i.sellPrice',
            'i.firstCollaborationImage1',
            'i.firstCollaborationImage2',
            'i.firstCollaborationImage3',
            'i.avgViews',
            'i.cpm',
            'i.buyPrice',
        ])
        .orderBy('i.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit)
        .andWhere('i.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
        qb.andWhere('(i.name ILike :search OR i.email ILike :search)', { search: `%${search}%` });
    }
    addOrWhereILike(qb, 'platform', platformFilter, 'platformFilter');

    const [influencers, total] = await qb.getManyAndCount();
    const items: InfluencerSelectItem[] = influencers.map((i) => ({
        id: i.id,
        name: i.name,
        platform: i.platform ?? null,
        platformLink: i.platformLink ?? null,
        inventory: i.inventory ?? null,
        sellPrice: i.sellPrice ?? null,
        firstCollaborationImage1: i.firstCollaborationImage1 ?? null,
        firstCollaborationImage2: i.firstCollaborationImage2 ?? null,
        firstCollaborationImage3: i.firstCollaborationImage3 ?? null,
        avgViews: i.avgViews ?? null,
        cpm: i.cpm ?? null,
        buyPrice: i.buyPrice ?? null,
    }));
    return { influencers: items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getInfluencerById = async (id: string) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    return influencer;
};

export type CreateInfluencerData = {
    name: string;
    email: string;
    telegramId?: string | null;
    whatsAppNumber?: string | null;
    primaryCountry?: string | null;
    primaryTimezone?: string | null;
    platform?: string | null;
    platformLink?: string | null;
    inventory?: string | null;
    buyPrice?: string | null;
    sellPrice?: string | null;
    cpm?: string | null;
    avgViews?: string | null;
    industries?: string | null;
    categories?: string | null;
    primaryAudienceGeography?: string | null;
    secondaryAudienceGeography?: string | null;
    ageScreenshotUrl?: string | null;
    genderScreenshotUrl?: string | null;
    topCountriesScreenshotUrl?: string | null;
    paymentTerms?: string | null;
    turnaroundTimes?: string | null;
    firstCollaborationImage1?: string | null;
    firstCollaborationImage2?: string | null;
    firstCollaborationImage3?: string | null;
    xLink?: string | null;
    instagramLink?: string | null;
    youtubeLink?: string | null;
    tiktokLink?: string | null;
    newsletterLink?: string | null;
    finalConfirmation?: boolean;
    isVerified?: boolean;
};

export const createInfluencer = async (data: CreateInfluencerData) => {
    const repo = AppDataSource.getRepository(Influencer);
    const buyPrice = data.buyPrice ?? null;
    const sellPrice =
        (buyPrice != null && String(buyPrice).trim() !== ''
            ? sellingPriceFromBuyingPrice(buyPrice)
            : null) ?? data.sellPrice ?? null;
    const influencer = repo.create({
        name: data.name,
        email: data.email.toLowerCase(),
        telegramId: data.telegramId ?? null,
        whatsAppNumber: data.whatsAppNumber ?? null,
        primaryCountry: data.primaryCountry ?? null,
        primaryTimezone: data.primaryTimezone ?? null,
        platform: data.platform ?? null,
        platformLink: data.platformLink ?? null,
        inventory: data.inventory ?? null,
        buyPrice: data.buyPrice ?? null,
        sellPrice,
        cpm: data.cpm ?? null,
        avgViews: data.avgViews ?? null,
        industries: data.industries ?? null,
        categories: data.categories ?? null,
        primaryAudienceGeography: data.primaryAudienceGeography ?? null,
        secondaryAudienceGeography: data.secondaryAudienceGeography ?? null,
        ageScreenshotUrl: data.ageScreenshotUrl ?? null,
        genderScreenshotUrl: data.genderScreenshotUrl ?? null,
        topCountriesScreenshotUrl: data.topCountriesScreenshotUrl ?? null,
        paymentTerms: data.paymentTerms ?? null,
        turnaroundTimes: data.turnaroundTimes ?? null,
        firstCollaborationImage1: data.firstCollaborationImage1 ?? null,
        firstCollaborationImage2: data.firstCollaborationImage2 ?? null,
        firstCollaborationImage3: data.firstCollaborationImage3 ?? null,
        xLink: data.xLink ?? null,
        instagramLink: data.instagramLink ?? null,
        youtubeLink: data.youtubeLink ?? null,
        tiktokLink: data.tiktokLink ?? null,
        newsletterLink: data.newsletterLink ?? null,
        finalConfirmation: data.finalConfirmation ?? false,
        isVerified: data.isVerified ?? false,
        isDeleted: false,
    });
    return repo.save(influencer);
};

export type UpdateInfluencerData = Partial<CreateInfluencerData>;

export const updateInfluencer = async (id: string, data: UpdateInfluencerData) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (data.name != null) influencer.name = data.name;
    if (data.email != null) influencer.email = data.email.toLowerCase();
    if (data.telegramId !== undefined) influencer.telegramId = data.telegramId;
    if (data.whatsAppNumber !== undefined) influencer.whatsAppNumber = data.whatsAppNumber;
    if (data.primaryCountry !== undefined) influencer.primaryCountry = data.primaryCountry;
    if (data.primaryTimezone !== undefined) influencer.primaryTimezone = data.primaryTimezone;
    if (data.platform !== undefined) influencer.platform = data.platform;
    if (data.platformLink !== undefined) influencer.platformLink = data.platformLink;
    if (data.inventory !== undefined) influencer.inventory = data.inventory;
    if (data.buyPrice !== undefined) {
        influencer.buyPrice = data.buyPrice;
        const computed = sellingPriceFromBuyingPrice(data.buyPrice);
        influencer.sellPrice = computed ?? data.sellPrice ?? influencer.sellPrice;
    }
    if (data.sellPrice !== undefined) influencer.sellPrice = data.sellPrice;
    if (data.cpm !== undefined) influencer.cpm = data.cpm;
    if (data.avgViews !== undefined) influencer.avgViews = data.avgViews;
    if (data.industries !== undefined) influencer.industries = data.industries;
    if (data.categories !== undefined) influencer.categories = data.categories;
    if (data.primaryAudienceGeography !== undefined) influencer.primaryAudienceGeography = data.primaryAudienceGeography;
    if (data.secondaryAudienceGeography !== undefined) influencer.secondaryAudienceGeography = data.secondaryAudienceGeography;
    if (data.ageScreenshotUrl !== undefined) influencer.ageScreenshotUrl = data.ageScreenshotUrl;
    if (data.genderScreenshotUrl !== undefined) influencer.genderScreenshotUrl = data.genderScreenshotUrl;
    if (data.topCountriesScreenshotUrl !== undefined) influencer.topCountriesScreenshotUrl = data.topCountriesScreenshotUrl;
    if (data.paymentTerms !== undefined) influencer.paymentTerms = data.paymentTerms;
    if (data.turnaroundTimes !== undefined) influencer.turnaroundTimes = data.turnaroundTimes;
    if (data.firstCollaborationImage1 !== undefined) influencer.firstCollaborationImage1 = data.firstCollaborationImage1;
    if (data.firstCollaborationImage2 !== undefined) influencer.firstCollaborationImage2 = data.firstCollaborationImage2;
    if (data.firstCollaborationImage3 !== undefined) influencer.firstCollaborationImage3 = data.firstCollaborationImage3;
    if (data.xLink !== undefined) influencer.xLink = data.xLink;
    if (data.instagramLink !== undefined) influencer.instagramLink = data.instagramLink;
    if (data.youtubeLink !== undefined) influencer.youtubeLink = data.youtubeLink;
    if (data.tiktokLink !== undefined) influencer.tiktokLink = data.tiktokLink;
    if (data.newsletterLink !== undefined) influencer.newsletterLink = data.newsletterLink;
    if (data.finalConfirmation !== undefined) influencer.finalConfirmation = data.finalConfirmation;
    if (data.isVerified !== undefined) influencer.isVerified = data.isVerified;
    return repo.save(influencer);
};

export const deleteInfluencer = async (id: string) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    influencer.isDeleted = true;
    influencer.deletedAt = new Date();
    return repo.save(influencer);
};

/** Hard-delete all influencers (remove from DB). Returns count of deleted. */
export const deleteAllInfluencers = async (): Promise<{ deleted: number }> => {
    const repo = AppDataSource.getRepository(Influencer);
    const result = await repo.createQueryBuilder().delete().from(Influencer).execute();
    const deleted = result.affected ?? 0;
    return { deleted };
};
