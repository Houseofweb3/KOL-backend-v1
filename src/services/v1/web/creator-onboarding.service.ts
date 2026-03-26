import HttpStatus from 'http-status-codes';
import { createInfluencer, sellingPriceFromBuyingPrice, stripPriceToNumeric, type CreateInfluencerData } from '../admin/influencer.service';
import { sendClientOnboardNotification } from '../../../notifications/client-onboard';

/** Must match creator-onboarding frontend Step 4 (platform → inventory item labels). */
const PLATFORM_INVENTORY_OPTIONS: Record<string, string[]> = {
    X: [
        'Single tweet',
        'Thread (5–7 tweets)',
        'Quote tweet',
        'Pinned tweet (7 days)',
        'AMA (X Spaces – 60 mins)',
        'Article',
    ],
    Youtube: [
        'Integrated video (≤3 mins)',
        'Sponsored-by tag',
        'Dedicated review / breakdown video',
        'Streams/Live trading video',
        'Shorts',
    ],
    Instagram: [
        'IG Reel – Original (Creator produces content) ( 24 hours )',
        'IG Reel – Adapted (Brand provides content)( 24 hours )',
        'IG Reel – Repost (Brand provides content) ( 24h )',
        'IG Reel – Original (Creator produces content) ( 7 hours )',
        'IG Reel – Adapted (Brand provides content)( 7 hours )',
        'IG Reel – Repost (Brand provides content) ( 7h )',
        'Carousel (3–5 slides)',
        'Story sequence (3 slides)',
        'Link in bio placement (7 days)',
        'Reel pinned (7 days)',
        'IG Reel – Original (Creator produces content)',
    ],
    TikTok: [
        'Tik Tok Original(with collab tag)',
        'Tik Tok Adapted(with collab tag)',
        'Tik Tok Live',
        'Tik Tok Story(3 carousel stories)',
    ],
    Newsletter: [
        'Sponsored-by mention (top)',
        'Sponsored-by mention (footer)',
        'Contextual integration within main content',
    ],
    'PR/Editorial': ['Organic PR with backlink', 'Thematic article (brand included in narrative)'],
    Spotify: [
        'Dedicated podcast episode',
        'Podcast sponsored mention',
        'Short clips distribution (IG / Shorts / TikTok)',
        'Short virtual podcast (IG / Shorts / TikTok)',
    ],
};

export interface CreatorOnboardingInventoryItem {
    selected: boolean;
    rate: string;
    averageViews?: string;
    cpm?: string;
    ccp?: string;
}

/** Request body: matches frontend CreatorOnboardingFormData. */
export interface CreatorOnboardingPayload {
    channelBrandName: string;
    primaryContactEmail: string;
    telegramId?: string;
    whatsappNumber?: string;
    primaryCountry?: string;
    primaryTimezone?: string;
    platforms?: string[];
    platformUrls?: Record<string, string>;
    industries?: string[];
    categories?: string[];
    inventoryItems?: Record<string, CreatorOnboardingInventoryItem>;
    primaryAudienceGeography?: string[];
    secondaryAudienceGeography?: string[];
    ageScreenshot?: string;
    genderScreenshot?: string;
    topCountriesScreenshot?: string;
    paymentTerms?: string;
    turnaroundTimes?: string[];
    firstCollaborationImage1?: string;
    firstCollaborationImage2?: string;
    firstCollaborationImage3?: string;
    xLink?: string;
    instagramLink?: string;
    youtubeLink?: string;
    tiktokLink?: string;
    newsletterLink?: string;
    finalConfirmation?: boolean;
}

export interface CreatorOnboardingResult {
    message: string;
    created: number;
    influencerIds: string[];
}

/**
 * Submit creator onboarding: create one influencer per (platform + selected inventory item) in DB.
 * buyPrice = rate (numeric only); sellPrice = buyPrice + 16% rounded to nearest 100.
 */
export async function submitCreatorOnboarding(payload: CreatorOnboardingPayload): Promise<CreatorOnboardingResult> {
    if (!payload.channelBrandName?.trim()) {
        const err = new Error('Channel / Brand Name is required.');
        (err as unknown as { status: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!payload.primaryContactEmail?.trim()) {
        const err = new Error('Primary Contact Email is required.');
        (err as unknown as { status: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const name = payload.channelBrandName.trim();
    const email = payload.primaryContactEmail.trim().toLowerCase();
    const platformUrls = payload.platformUrls ?? {};
    const inventoryItems = payload.inventoryItems ?? {};
    const platforms = payload.platforms ?? [];

    const toStr = (arr: string[] | undefined): string | null =>
        arr && arr.length > 0 ? arr.join(', ') : null;

    const influencerIds: string[] = [];

    for (const platform of platforms) {
        const platformLink = platformUrls[platform] ?? '';
        const optionsForPlatform = PLATFORM_INVENTORY_OPTIONS[platform] ?? [];
        for (const inventoryLabel of optionsForPlatform) {
            const inv = inventoryItems[inventoryLabel];
            if (!inv?.selected) continue;
            const rate = inv.rate != null ? String(inv.rate).trim() : '';
            if (!rate || rate === '0') continue;

            const buyPrice = stripPriceToNumeric(rate);
            const sellPrice = buyPrice != null ? sellingPriceFromBuyingPrice(buyPrice) : null;
            const avgViews = inv.averageViews != null ? String(inv.averageViews).trim() || null : null;
            const cpm = inv.cpm != null && String(inv.cpm).trim() !== '' ? stripPriceToNumeric(inv.cpm) : null;
            const ccp = inv.ccp != null && String(inv.ccp).trim() !== '' ? stripPriceToNumeric(inv.ccp) : null;

            const data: CreateInfluencerData = {
                name,
                email,
                telegramId: payload.telegramId?.trim() || null,
                whatsAppNumber: payload.whatsappNumber?.trim() || null,
                primaryCountry: payload.primaryCountry?.trim() || null,
                primaryTimezone: payload.primaryTimezone?.trim() || null,
                platform: platform || null,
                platformLink: platformLink || null,
                inventory: inventoryLabel || null,
                buyPrice: buyPrice ?? null,
                sellPrice,
                cpm,
                ccp,
                avgViews,
                industries: toStr(payload.industries),
                categories: toStr(payload.categories),
                primaryAudienceGeography: toStr(payload.primaryAudienceGeography),
                secondaryAudienceGeography: toStr(payload.secondaryAudienceGeography),
                ageScreenshotUrl: payload.ageScreenshot?.trim() || null,
                genderScreenshotUrl: payload.genderScreenshot?.trim() || null,
                topCountriesScreenshotUrl: payload.topCountriesScreenshot?.trim() || null,
                paymentTerms: payload.paymentTerms?.trim() || null,
                turnaroundTimes: payload.turnaroundTimes && payload.turnaroundTimes.length > 0
                    ? payload.turnaroundTimes.join(', ')
                    : null,
                firstCollaborationImage1: payload.firstCollaborationImage1?.trim() || null,
                firstCollaborationImage2: payload.firstCollaborationImage2?.trim() || null,
                firstCollaborationImage3: payload.firstCollaborationImage3?.trim() || null,
                xLink: payload.xLink?.trim() || null,
                instagramLink: payload.instagramLink?.trim() || null,
                youtubeLink: payload.youtubeLink?.trim() || null,
                tiktokLink: payload.tiktokLink?.trim() || null,
                newsletterLink: payload.newsletterLink?.trim() || null,
                finalConfirmation: !!payload.finalConfirmation,
                // New creators must be manually reviewed/verified by admin.
                isVerified: false,
            };

            const saved = await createInfluencer(data);
            const ids = Array.isArray(saved) ? saved.map((s) => s.id) : [saved.id];
            influencerIds.push(...ids);
        }
    }

    if (influencerIds.length === 0) {
        const err = new Error('No inventory items with a rate were selected. Please select at least one item and enter a rate.');
        (err as unknown as { status: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const summary = [
        'New Creator Onboarding entry',
        `Channel/Brand: ${name}`,
        `Email: ${email}`,
        `Platforms: ${platforms.join(', ') || '-'}`,
        `Created ${influencerIds.length} influencer record(s)`,
        `Submitted at: ${new Date().toISOString()}`,
    ].join('\n');
    await sendClientOnboardNotification({
        formType: 'creator',
        subject: `New Creator Onboarding – ${name}`,
        summary,
    });

    return {
        message: 'Form submitted successfully!',
        created: influencerIds.length,
        influencerIds,
    };
}
