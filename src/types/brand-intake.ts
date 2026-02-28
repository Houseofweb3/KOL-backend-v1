/**
 * Brand intake form payload (e.g. from website signup).
 * Arrays are sent from frontend; we map to comma-separated strings for Client entity.
 */
export interface BrandIntakeFormData {
    brandProductName: string;
    websiteLink: string;
    primaryContactEmail: string;
    telegramId?: string;
    whatsappNumber?: string;

    categories?: string[];
    audienceReadinessLevel?: string;

    campaignGoals?: string[];

    monetizationModel?: string[];
    revenueModel?: string;
    marketFocus?: string;

    primaryAudienceGeography?: string[];
    ageRange?: string;
    genderSkew?: string;
    geographicLocation?: string;

    campaignStartTimeline?: string;
    campaignStartDate?: string;
    campaignEndDate?: string;

    customBrief?: string;
}
