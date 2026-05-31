import HttpStatus from 'http-status-codes';
import { Brackets } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Influencer } from '../../../entity/influencer.entity';

const DEFAULT_PAGE = 1;

/** Strip $ and any non-numeric characters; keep digits and one decimal point. Returns numeric string for storage. */
export function stripPriceToNumeric(val: string | number | null | undefined): string | null {
    if (val == null) return null;
    const s = String(val).replace(/[^\d.]/g, '').trim();
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? String(n) : null;
}

/** Parse buying/sell price from string or number. Strips $ and non-numeric. Returns null if invalid or empty. */
export function parsePrice(val: string | number | null | undefined): number | null {
    const str = stripPriceToNumeric(val);
    if (str == null) return null;
    const n = parseFloat(str);
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

/** Parse avg views (strip non-numeric). Returns null if invalid/empty/<=0. */
export function parseAvgViews(val: string | number | null | undefined): number | null {
    if (val == null) return null;
    const s = String(val).replace(/[^\d.]/g, '').trim();
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * CPM-like metric: (price / avgViews) * 1000.
 * Returns string (trimmed) or null when inputs are missing/invalid.
 */
export function calculatePricePerThousand(priceInput: string | number | null | undefined, avgViewsInput: string | number | null | undefined): string | null {
    const price = parsePrice(priceInput);
    const views = parseAvgViews(avgViewsInput);
    if (price == null || views == null) return null;
    const value = (price / views) * 1000;
    if (!Number.isFinite(value) || value < 0) return null;
    // keep 2 decimals, but avoid trailing .00
    const fixed = value.toFixed(2);
    return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
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
    ccp: string | null;
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
            'i.ccp',
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
        // Always compute/normalize `ccp` from buyPrice + avgViews.
        ccp: calculatePricePerThousand(i.buyPrice, i.avgViews) ?? null,
        buyPrice: i.buyPrice ?? null,
    }));
    return { influencers: items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/** Content type item for API (GET response and create/update payload). */
export interface ContentTypeItem {
    id?: string;
    contentType: string;
    quantity: string;
    avgView: string;
    price: string;
    sellingPrice?: string | null;
    cpm?: string | null;
    ccp?: string | null;
}

/** GET influencer by id; returns influencer + contentTypes (one row built from influencer fields – no extra entity). */
export const getInfluencerById = async (id: string) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as unknown as { status: number }).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const contentTypes =
        influencer.inventory != null || influencer.buyPrice != null || influencer.avgViews != null
            ? [
                  {
                      id: influencer.id,
                      contentType: influencer.inventory ?? '',
                      quantity: '1',
                      avgView: influencer.avgViews ?? '',
                      price: influencer.buyPrice ?? '',
                      sellingPrice: influencer.sellPrice ?? null,
                      cpm: influencer.cpm ?? null,
                      // Always compute/normalize `ccp` from buyPrice + avgViews.
                      ccp: calculatePricePerThousand(influencer.buyPrice, influencer.avgViews) ?? null,
                  },
              ]
            : [];
    return { ...influencer, contentTypes };
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
    ccp?: string | null;
    avgViews?: string | null;
    industries?: string | null;
    categories?: string | null;
    creatorType?: string | null;
    primaryAudienceGeography?: string | null;
    secondaryAudienceGeography?: string | null;
    ageScreenshotUrl?: string | null;
    genderScreenshotUrl?: string | null;
    topCountriesScreenshotUrl?: string | null;
    paymentTerms?: string | null;
    turnaroundTimes?: string | null;
    firstCollaborationPostLink1?: string | null;
    firstCollaborationPostLink2?: string | null;
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
    /** Connected Instagram account FK (set during creator onboarding when the creator linked Instagram). */
    instagramAccountId?: string | null;
    /** For create: first item mapped to influencer inventory/buyPrice/sellPrice/avgViews/cpm (no extra entity). */
    contentTypes?: ContentTypeItem[];
}

/** Build influencer entity fields. When ct is set, use ct for inventory/price (one influencer per content type). */
function baseInfluencerFromData(data: CreateInfluencerData, ct?: ContentTypeItem) {
    const price = ct?.price ?? data.buyPrice ?? null;
    const sellPrice =
        ct != null
            ? (ct.sellingPrice ?? sellingPriceFromBuyingPrice(ct.price)) ?? null
            : (data.buyPrice != null && String(data.buyPrice).trim() !== ''
                  ? sellingPriceFromBuyingPrice(data.buyPrice)
                  : null) ?? data.sellPrice ?? null;

    const avgViews = ct?.avgView ?? data.avgViews ?? null;
    const computedCpm = calculatePricePerThousand(sellPrice, avgViews);
    const computedCcp = calculatePricePerThousand(price, avgViews);
    return {
        name: data.name,
        email: data.email.toLowerCase(),
        telegramId: data.telegramId ?? null,
        whatsAppNumber: data.whatsAppNumber ?? null,
        primaryCountry: data.primaryCountry ?? null,
        primaryTimezone: data.primaryTimezone ?? null,
        platform: data.platform ?? null,
        platformLink: data.platformLink ?? null,
        inventory: ct?.contentType ?? data.inventory ?? null,
        buyPrice: ct?.price ?? data.buyPrice ?? null,
        sellPrice,
        cpm: ct?.cpm ?? data.cpm ?? computedCpm ?? null,
        ccp: ct?.ccp ?? data.ccp ?? computedCcp ?? null,
        avgViews,
        industries: data.industries ?? null,
        categories: data.categories ?? null,
        creatorType: data.creatorType ?? null,
        primaryAudienceGeography: data.primaryAudienceGeography ?? null,
        secondaryAudienceGeography: data.secondaryAudienceGeography ?? null,
        ageScreenshotUrl: data.ageScreenshotUrl ?? null,
        genderScreenshotUrl: data.genderScreenshotUrl ?? null,
        topCountriesScreenshotUrl: data.topCountriesScreenshotUrl ?? null,
        paymentTerms: data.paymentTerms ?? null,
        turnaroundTimes: data.turnaroundTimes ?? null,
        firstCollaborationPostLink1: data.firstCollaborationPostLink1 ?? null,
        firstCollaborationPostLink2: data.firstCollaborationPostLink2 ?? null,
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
        instagramAccountId: data.instagramAccountId ?? null,
        isDeleted: false,
    };
}

/**
 * Create influencer(s). If contentTypes has multiple items, creates one influencer per item
 * (same profile, each with that item's inventory/price). Returns saved entity/entities only (no contentTypes array).
 */
export const createInfluencer = async (
    data: CreateInfluencerData
): Promise<Influencer | Influencer[]> => {
    const repo = AppDataSource.getRepository(Influencer);
    const items = Array.isArray(data.contentTypes) ? data.contentTypes : [];
    if (items.length <= 1) {
        const firstCt = items[0];
        const influencer = repo.create(baseInfluencerFromData(data, firstCt));
        return repo.save(influencer);
    }
    const created: Influencer[] = [];
    for (const ct of items) {
        const influencer = repo.create(baseInfluencerFromData(data, ct));
        const saved = await repo.save(influencer);
        created.push(saved);
    }
    return created;
};

export type UpdateInfluencerData = Partial<CreateInfluencerData>;

export const updateInfluencer = async (id: string, data: UpdateInfluencerData) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as unknown as { status: number }).status = HttpStatus.NOT_FOUND;
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
        // `ccp` is always derived from buyPrice + avgViews.
        const computedCcp = calculatePricePerThousand(influencer.buyPrice, data.avgViews ?? influencer.avgViews);
        influencer.ccp = computedCcp ?? null;
    }
    if (data.sellPrice !== undefined) influencer.sellPrice = data.sellPrice;
    if (data.cpm !== undefined) influencer.cpm = data.cpm;
    if (data.avgViews !== undefined) influencer.avgViews = data.avgViews;

    // If avgViews changed and CPM/CCP aren't explicitly set, recompute (if possible).
    if (data.avgViews !== undefined) {
        if (data.cpm === undefined) {
            const computedCpm = calculatePricePerThousand(influencer.sellPrice, influencer.avgViews);
            if (computedCpm != null) influencer.cpm = computedCpm;
        }
        // `ccp` is always derived from buyPrice + avgViews.
        const computedCcp = calculatePricePerThousand(influencer.buyPrice, influencer.avgViews);
        influencer.ccp = computedCcp ?? null;
    }

    // If caller sent `ccp` (any value), ignore it and still enforce derived value.
    if (data.ccp !== undefined && data.buyPrice === undefined && data.avgViews === undefined) {
        const computedCcp = calculatePricePerThousand(influencer.buyPrice, influencer.avgViews);
        influencer.ccp = computedCcp ?? null;
    }
    if (data.industries !== undefined) influencer.industries = data.industries;
    if (data.categories !== undefined) influencer.categories = data.categories;
    if (data.creatorType !== undefined) influencer.creatorType = data.creatorType;
    if (data.primaryAudienceGeography !== undefined) influencer.primaryAudienceGeography = data.primaryAudienceGeography;
    if (data.secondaryAudienceGeography !== undefined) influencer.secondaryAudienceGeography = data.secondaryAudienceGeography;
    if (data.ageScreenshotUrl !== undefined) influencer.ageScreenshotUrl = data.ageScreenshotUrl;
    if (data.genderScreenshotUrl !== undefined) influencer.genderScreenshotUrl = data.genderScreenshotUrl;
    if (data.topCountriesScreenshotUrl !== undefined) influencer.topCountriesScreenshotUrl = data.topCountriesScreenshotUrl;
    if (data.paymentTerms !== undefined) influencer.paymentTerms = data.paymentTerms;
    if (data.turnaroundTimes !== undefined) influencer.turnaroundTimes = data.turnaroundTimes;
    if (data.firstCollaborationPostLink1 !== undefined) {
        influencer.firstCollaborationPostLink1 = data.firstCollaborationPostLink1;
    }
    if (data.firstCollaborationPostLink2 !== undefined) {
        influencer.firstCollaborationPostLink2 = data.firstCollaborationPostLink2;
    }
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

    if (Array.isArray(data.contentTypes) && data.contentTypes.length > 0) {
        const withId = data.contentTypes.find((ct) => ct.id != null && String(ct.id).trim() !== '');
        const withoutId = data.contentTypes.filter((ct) => ct.id == null || String(ct.id).trim() === '');
        const rowForExisting = withId ?? data.contentTypes[0];
        influencer.inventory = rowForExisting.contentType;
        influencer.buyPrice = rowForExisting.price;
        influencer.sellPrice =
            rowForExisting.sellingPrice ?? sellingPriceFromBuyingPrice(rowForExisting.price) ?? influencer.sellPrice;
        influencer.cpm = rowForExisting.cpm ?? null;
        influencer.avgViews = rowForExisting.avgView ?? null;
        // Always derive `ccp` from buyPrice + avgViews; if not computable, store NULL.
        influencer.ccp = calculatePricePerThousand(influencer.buyPrice, influencer.avgViews) ?? null;

        // Auto compute CPM if not provided.
        if (rowForExisting.cpm == null) {
            const computedCpm = calculatePricePerThousand(influencer.sellPrice, influencer.avgViews);
            if (computedCpm != null) influencer.cpm = computedCpm;
        }
        for (const ct of withoutId) {
            const createData: CreateInfluencerData = {
                name: data.name ?? influencer.name,
                email: data.email ?? influencer.email,
                telegramId: data.telegramId ?? influencer.telegramId,
                whatsAppNumber: data.whatsAppNumber ?? influencer.whatsAppNumber,
                primaryCountry: data.primaryCountry ?? influencer.primaryCountry,
                primaryTimezone: data.primaryTimezone ?? influencer.primaryTimezone,
                platform: data.platform ?? influencer.platform,
                platformLink: data.platformLink ?? influencer.platformLink,
                industries: data.industries ?? influencer.industries,
                categories: data.categories ?? influencer.categories,
                creatorType: data.creatorType ?? influencer.creatorType,
                primaryAudienceGeography: data.primaryAudienceGeography ?? influencer.primaryAudienceGeography,
                secondaryAudienceGeography: data.secondaryAudienceGeography ?? influencer.secondaryAudienceGeography,
                ageScreenshotUrl: data.ageScreenshotUrl ?? influencer.ageScreenshotUrl,
                genderScreenshotUrl: data.genderScreenshotUrl ?? influencer.genderScreenshotUrl,
                topCountriesScreenshotUrl: data.topCountriesScreenshotUrl ?? influencer.topCountriesScreenshotUrl,
                paymentTerms: data.paymentTerms ?? influencer.paymentTerms,
                turnaroundTimes: data.turnaroundTimes ?? influencer.turnaroundTimes,
                firstCollaborationPostLink1:
                    data.firstCollaborationPostLink1 ?? influencer.firstCollaborationPostLink1,
                firstCollaborationPostLink2:
                    data.firstCollaborationPostLink2 ?? influencer.firstCollaborationPostLink2,
                firstCollaborationImage1: data.firstCollaborationImage1 ?? influencer.firstCollaborationImage1,
                firstCollaborationImage2: data.firstCollaborationImage2 ?? influencer.firstCollaborationImage2,
                firstCollaborationImage3: data.firstCollaborationImage3 ?? influencer.firstCollaborationImage3,
                xLink: data.xLink ?? influencer.xLink,
                instagramLink: data.instagramLink ?? influencer.instagramLink,
                youtubeLink: data.youtubeLink ?? influencer.youtubeLink,
                tiktokLink: data.tiktokLink ?? influencer.tiktokLink,
                newsletterLink: data.newsletterLink ?? influencer.newsletterLink,
                finalConfirmation: data.finalConfirmation ?? influencer.finalConfirmation,
                isVerified: data.isVerified ?? influencer.isVerified,
                // `ccp` will be computed inside baseInfluencerFromData.
                contentTypes: [{ ...ct, contentType: ct.contentType, quantity: ct.quantity ?? '1', avgView: ct.avgView, price: ct.price, sellingPrice: ct.sellingPrice ?? undefined, cpm: ct.cpm ?? undefined, ccp: undefined }],
            };
            await createInfluencer(createData);
        }
    }

    await repo.save(influencer);
    return getInfluencerById(id);
};

export const deleteInfluencer = async (id: string) => {
    const repo = AppDataSource.getRepository(Influencer);
    const influencer = await repo.findOne({ where: { id } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as unknown as { status: number }).status = HttpStatus.NOT_FOUND;
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
