/**
 * Creator onboarding Step 4 / admin stats canonical lists.
 * Keep in sync with the creator onboarding frontend.
 */

/** “About me → I am a …” roles (single select). */
export const CREATOR_TYPE_OPTIONS = [
    'Influencer',
    'Content creator',
    'Videographer',
    'Photographer',
    'Blogger',
    'Vlogger',
    'Reel specialist',
    'Event Host',
    'Event organizer',
    'Script writer',
    'Voice artist',
    'Actor',
    'Artist',
] as const;

export type CreatorTypeOption = (typeof CREATOR_TYPE_OPTIONS)[number];

export const PLATFORM_INVENTORY_OPTIONS: Record<string, string[]> = {
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
        "Collab Tag"
    ],
    Instagram: [
        'IG Reel – Original (Creator produces content) ( 24 hours )',
        'IG Reel – Adapted (Brand provides content) ( 24 hours )',
        'IG Reel – Repost (Brand provides content) ( 24 hours )',
        'IG Reel – Original (Creator produces content) ( 7 days )',
        'IG Reel – Adapted (Brand provides content) ( 7 days )',
        'IG Reel – Repost (Brand provides content) ( 7 days )',
        'IG Reel – Original (Creator produces content)',
        'IG Reel – Repost (Brand provides content)',
        'Carousel (3–5 slides)',
        'Story sequence (3 slides)',
        'Link in bio placement (7 days)',
        'Reel / TikTok pinned (7 days)',
        'Collab Tag',
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

export const INDUSTRY_CATEGORY_OPTIONS: Record<string, string[]> = {
    Crypto: [
        'Crypto DeFi',
        'Crypto Infrastructure',
        'Crypto Trading & Prediction Market',
        'Crypto Memecoin',
        'Crypto Podcaster',
        'Crypto Clippers',
        'Crypto X Gamefi',
        'Generic Altcoiners',
        'Crypto X AI',
    ],
    AI: [
        'AI product Tools Review',
        'AI education',
        'AI news & releases',
        'AI Podcasts',
        'AI clippers',
    ],
    Startups: [
        'Startup News & Media',
        'Startup Product Reviews',
        'Startup Business Explainer',
        'Startup Growth & Marketing',
        'Startup Podcast',
        'Startup Clippers',
    ],
    'Trading & Fintech': [
        'Fintech Traders',
        'Fintech news & trends',
        'Fintech product reviews',
        'Fintech Podcasters',
        'Fintech clippers',
        'Metals Forex Indice Trading',
    ],
    'Robotics & Hardware': [
        'R&H Tech & Gadget creators',
        'R&H lifestyle creators',
        'R&H product reviews',
        'R&H innovation & future tech',
        'R&H podcasters',
        'R&H clippers',
    ],
    'Health & Fitness': [
        'Motivation - Clippers',
        'Health & Fitness - Physical Fitness',
        'Health & Fitness - Diet & Nutrition',
        'Health & Fitness - Biohacking',
        'Health & Fitness - Mental Health',
        'Health & Fitness - Podcasters',
        'Health & Fitness - Clippers',
    ],
    Travel: [
        'Couple travel',
        'Solo Travel',
        'City Guides & Hidden Gems',
        'Hotel & Resort Reviews',
        'Luxury Travel & Experiences',
        'Travel Vlogger',
        'Travel Podcast',
    ],
};
