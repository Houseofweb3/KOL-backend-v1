import HttpStatus from 'http-status-codes';
import { Client } from '../../../entity/client.entity';
import { Otp } from '../../../entity/otp.entity';
import { AppDataSource } from '../../../config/data-source';
import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { generateClientToken3Days } from '../../../middleware/auth';
import { sendClientOtpEmail } from '../../../utils/email';
import { createClient } from '../admin/client.service';
import { sendClientOnboardNotification } from '../../../notifications';
import { createCart } from '../admin/cart.service';
import { createProposalLink } from '../admin/proposal-link.service';
import { AUTO_PROPOSAL_MAX_INFLUENCERS } from '../../../constants/auto-proposal';
import { Influencer } from '../../../entity/influencer.entity';
import type { BrandIntakeFormData } from '../../../types/brand-intake';

function toStr(v: string | string[] | undefined): string | null {
    if (v == null) return null;
    if (Array.isArray(v)) return v.filter(Boolean).join(', ') || null;
    return String(v).trim() || null;
}

/**
 * Map brand intake form payload to Client create data.
 * Required: brandProductName → name, websiteLink → website, primaryContactEmail → email.
 */
function mapBrandIntakeToClient(data: BrandIntakeFormData): Parameters<typeof createClient>[0] {
    return {
        name: (data.brandProductName || '').trim(),
        email: (data.primaryContactEmail || '').trim().toLowerCase(),
        website: (data.websiteLink || '').trim() || null,
        telegramId: (data.telegramId || '').trim() || null,
        whatsAppNumber: (data.whatsappNumber || '').trim() || null,
        categories: toStr(data.categories),
        campaignGoals: toStr(data.campaignGoals),
        monetizationModel: toStr(data.monetizationModel),
        primaryAudienceGeography: toStr(data.primaryAudienceGeography),
        ageRange: (data.ageRange || '').trim() || null,
        genderSkew: (data.genderSkew || '').trim() || null,
        campaignStartTimeline: (data.campaignStartTimeline || '').trim() || null,
        customBrief: (data.customBrief || '').trim() || null,
    };
}

function normalizeList(v: unknown): string[] {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
    const s = String(v).trim();
    if (!s) return [];
    return s
        .split(/[,|;/\n\r\t]+/g)
        .map((x) => x.trim())
        .filter(Boolean);
}

function normalizeToken(s: string): string {
    return s.trim().toLowerCase();
}

function includesTokenSet(haystack: string | null | undefined, needles: Set<string>): boolean {
    const tokens = normalizeList(haystack).map(normalizeToken);
    for (const t of tokens) {
        if (needles.has(t)) return true;
    }
    return false;
}

function matchesAnyToken(haystack: string | null | undefined, needles: Set<string>): boolean {
    const raw = String(haystack ?? '').trim();
    if (!raw) return false;
    const normalizedHay = normalizeToken(raw);
    if (needles.has(normalizedHay)) return true;
    // Handle cases like "Europe (All Zones)" vs "Europe" or "South Asia (Includes ...)".
    for (const needle of needles) {
        if (!needle) continue;
        if (normalizedHay.includes(needle) || needle.includes(normalizedHay)) return true;
    }
    return false;
}

/**
 * Client signup (brand intake): create client in DB from form data, then notify team.
 * No password; client logs in later via OTP to this email.
 */
export const clientSignup = async (payload: BrandIntakeFormData) => {
    const name = (payload.brandProductName || '').trim();
    const email = (payload.primaryContactEmail || '').trim();
    const website = (payload.websiteLink || '').trim();
    logger.info(`Client signup: received brand intake (email=${email || 'n/a'})`);
    if (!name) {
        const err = new Error('Brand / Product Name is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!website) {
        const err = new Error('Website Link is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!email) {
        const err = new Error('Primary Contact Email is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const createData = mapBrandIntakeToClient(payload);
    const clientRepo = AppDataSource.getRepository(Client);
    const normalizedEmail = email.trim().toLowerCase();
    let client = await clientRepo.findOne({ where: { email: normalizedEmail } });
    if (client) {
        if (client.isDeleted) {
            const err = new Error('Account has been deactivated. Contact support.');
            (err as any).status = HttpStatus.FORBIDDEN;
            (err as any).code = 'ACCOUNT_DEACTIVATED';
            throw err;
        }
        logger.info(`Client signup: existing client found (clientId=${client.id}, email=${client.email})`);
        // Best-effort refresh of intake fields for repeat submissions.
        client.name = createData.name || client.name;
        client.website = createData.website ?? client.website;
        client.telegramId = createData.telegramId ?? client.telegramId;
        client.whatsAppNumber = createData.whatsAppNumber ?? client.whatsAppNumber;
        client.categories = createData.categories ?? client.categories;
        client.campaignGoals = createData.campaignGoals ?? client.campaignGoals;
        client.monetizationModel = createData.monetizationModel ?? client.monetizationModel;
        client.primaryAudienceGeography = createData.primaryAudienceGeography ?? client.primaryAudienceGeography;
        client.ageRange = createData.ageRange ?? client.ageRange;
        client.genderSkew = createData.genderSkew ?? client.genderSkew;
        client.campaignStartTimeline = createData.campaignStartTimeline ?? client.campaignStartTimeline;
        client.customBrief = createData.customBrief ?? client.customBrief;
        client = await clientRepo.save(client);
    } else {
        client = await createClient(createData);
        logger.info(`Client signup: client created (clientId=${client.id}, email=${client.email})`);
    }

    // Auto-create a proposal cart based on intake form filters (best-effort; signup should still succeed if this fails).
    let autoProposalUrl: string | null = null;
    let autoProposalCartId: string | null = null;
    try {
        const desiredCountries = new Set(normalizeList(payload.primaryAudienceGeography).map(normalizeToken));
        const desiredIndustries = new Set(normalizeList(payload.categories).map(normalizeToken));

        logger.info(
            `Client signup: auto-proposal start (clientId=${client.id}, desiredCountries=${desiredCountries.size}, industries=${desiredIndustries.size})`
        );
        if (desiredCountries.size > 0 && desiredIndustries.size > 0) {
            const influencerRepo = AppDataSource.getRepository(Influencer);
            const all = await influencerRepo.find({ where: { isDeleted: false } });
            const matched = all.filter((inf) => {
                if (!matchesAnyToken(inf.primaryCountry, desiredCountries)) return false;
                return includesTokenSet(inf.industries, desiredIndustries);
            });

            logger.info(
                `Client signup: auto-proposal matched influencers (clientId=${client.id}, matched=${matched.length}, total=${all.length})`
            );
            const limited = matched.slice(0, AUTO_PROPOSAL_MAX_INFLUENCERS);
            if (limited.length > 0) {
                const cart = await createCart({
                    clientId: client.id,
                    currency: 'USD',
                    items: limited.map((inf) => ({
                        influencerId: inf.id,
                        quantity: 1,
                        // omit price: admin createCart will default to influencer.sellPrice (USD)
                    })),
                });
                autoProposalCartId = cart.id;
                logger.info(
                    `Client signup: auto-proposal cart created (clientId=${client.id}, cartId=${cart.id}, items=${limited.length})`
                );
                const link = await createProposalLink(cart.id);
                autoProposalUrl = link.url;
                logger.info(
                    `Client signup: auto-proposal link created (clientId=${client.id}, cartId=${cart.id}, emailSent=${link.emailSent}, url=${link.url})`
                );
                if (!link.emailSent) {
                    logger.warn(
                        `Client signup: auto-proposal email not sent (clientId=${client.id}, cartId=${cart.id}, error=${link.emailError || 'unknown'})`
                    );
                }
            } else {
                logger.info(`Client signup: auto-proposal skipped (clientId=${client.id}, reason=no_matched_influencers)`);
            }
        } else {
            logger.info(
                `Client signup: auto-proposal skipped (clientId=${client.id}, reason=missing_country_or_categories)`
            );
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        logger.error(`Client signup: auto-proposal failed (clientId=${client.id}): ${msg}`);
        // best-effort; don't block signup
    }

    const date = new Date();
    const formattedDate = date.toISOString().slice(0, 10);
    const summary = [
        'New Brand Intake entry',
        `Brand/Product: ${name}`,
        `Website: ${website}`,
        `Email: ${client.email}`,
        `Submitted at: ${formattedDate} ${date.toISOString().slice(11, 19)}`,
    ].join('\n');
    await sendClientOnboardNotification({
        formType: 'brand',
        subject: `New Brand Intake – ${name}`,
        summary,
    });

    const token = generateClientToken3Days(client.id, client.email);
    return {
        message: 'Form submitted successfully',
        client: {
            id: client.id,
            name: client.name,
            email: client.email,
            projectName: null,
            projectUrl: null,
            telegramId: client.telegramId ?? null,
            whatsAppNumber: client.whatsAppNumber ?? null,
        },
        ...(autoProposalCartId && { autoProposalCartId }),
        ...(autoProposalUrl && { autoProposalUrl }),
        token,
    };
};

const OTP_EXPIRY_MS = ENV.OTP_EXPIRY_MINUTES * 60 * 1000;
const OTP_LENGTH = Math.min(9, Math.max(4, ENV.OTP_LENGTH));

function generateOtpCode(): string {
    const max = Math.pow(10, OTP_LENGTH) - 1;
    const n = Math.floor(Math.random() * (max + 1));
    return n.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Send OTP to email. Confirms email exists in clients table and client is not deleted. Same flow as admin (OTP table + email).
 */
export const clientSendOtp = async (email: string) => {
    const clientRepo = AppDataSource.getRepository(Client);
    const client = await clientRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!client) {
        const err = new Error('No client found with this email. If you are a new client, please sign up first.');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (client.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const otpRepo = AppDataSource.getRepository(Otp);
    const otp = otpRepo.create({
        email: email.toLowerCase(),
        code,
        expiresAt,
        isUsed: false,
    });
    await otpRepo.save(otp);

    await sendClientOtpEmail(email.toLowerCase(), code, ENV.OTP_EXPIRY_MINUTES);

    return { message: 'OTP sent successfully', expiresInMinutes: ENV.OTP_EXPIRY_MINUTES };
};

/**
 * Verify OTP and return client + JWT (3 days). Token contains client id and email. Same flow as admin verify.
 */
export const clientVerifyOtp = async (email: string, code: string) => {
    const otpRepo = AppDataSource.getRepository(Otp);
    const otp = await otpRepo.findOne({
        where: { email: email.toLowerCase(), code, isUsed: false },
        order: { createdAt: 'DESC' },
    });
    if (!otp) {
        const err = new Error('Invalid or expired OTP');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (new Date() > otp.expiresAt) {
        const err = new Error('OTP has expired');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }

    otp.isUsed = true;
    await otpRepo.save(otp);

    const clientRepo = AppDataSource.getRepository(Client);
    const client = await clientRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!client) {
        const err = new Error('Client not found. please sign up first Or contact support.');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (client.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }

    const token = generateClientToken3Days(client.id, client.email);
    return {
        client: {
            id: client.id,
            name: client.name,
            email: client.email,
            telegramId: client.telegramId ?? null,
            whatsAppNumber: client.whatsAppNumber ?? null,
        },
        token,
    };
};
