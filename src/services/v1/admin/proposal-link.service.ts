import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { ProposalLink } from '../../../entity/proposal-link.entity';
import { Cart } from '../../../entity/cart.entity';
import { CartStatus } from '../../../constants/cart';
import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { sendProposalLinkEmail } from '../../../notifications/proposal-link-email';
import {
    buildProposalClientUrl,
    formatCartCreatedDateForProposalUrl,
    slugifyClientNameForProposal,
} from '../../../utils/proposal-url';

const jwtSecret = ENV.JWT_SECRET;
const PROPOSAL_JWT_NAMESPACE = 'proposal';

export interface ProposalTokenPayload {
    namespace: string;
    proposalLinkId: string;
    cartId: string;
    clientId: string;
}

/** Sign proposal token (no expiry; invalidation is via ProposalLink.usedAt). */
export function signProposalToken(payload: Omit<ProposalTokenPayload, 'namespace'>): string {
    return jwt.sign(
        { ...payload, namespace: PROPOSAL_JWT_NAMESPACE } as ProposalTokenPayload,
        jwtSecret
        // no expiresIn - link invalidated when ProposalLink.usedAt is set
    );
}

/** Decode and verify proposal token. Returns payload or throws. */
export function verifyProposalToken(token: string): ProposalTokenPayload {
    const decoded = jwt.verify(token, jwtSecret) as ProposalTokenPayload;
    if (decoded.namespace !== PROPOSAL_JWT_NAMESPACE || !decoded.proposalLinkId || !decoded.cartId || !decoded.clientId) {
        const err = new Error('Invalid proposal token');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return decoded;
}

export interface CreateProposalLinkResult {
    proposalLinkId: string;
    token: string;
    /** Full client URL: /proposals/{clientSlug}/{YYYY-MM-DD}/{cartId} */
    url: string;
    /** Parsed path segments (for admin UI / deep links without parsing URL). */
    path: {
        clientSlug: string;
        date: string;
        cartId: string;
    };
    emailSent: boolean;
    emailError?: string;
}

/**
 * Create or reuse a proposal link for a cart. If a proposal link already exists for this cart, the existing
 * row is updated (usedAt cleared) and a new token/URL is returned. Otherwise a new link is created.
 * Returns URL to send in email:
 * `{base}/proposals/{client-slug}/{cart-created-date-UTC}/{cartId}`.
 */
export async function createProposalLink(cartId: string): Promise<CreateProposalLinkResult> {
    const cartRepo = AppDataSource.getRepository(Cart);
    const linkRepo = AppDataSource.getRepository(ProposalLink);

    const cart = await cartRepo.findOne({ where: { id: cartId }, relations: ['client'] });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const clientId = cart.clientId;

    cart.status = CartStatus.SEND;
    await cartRepo.save(cart);

    let saved: ProposalLink;
    const existing = await linkRepo.findOne({
        where: { cartId: cart.id },
        order: { createdAt: 'DESC' },
    });
    if (existing) {
        existing.usedAt = null;
        saved = await linkRepo.save(existing);
    } else {
        const link = linkRepo.create({
            cartId: cart.id,
            clientId,
            usedAt: null,
        });
        saved = await linkRepo.save(link);
    }

    const token = signProposalToken({
        proposalLinkId: saved.id,
        cartId: saved.cartId,
        clientId: saved.clientId,
    });

    const baseUrl = (ENV.CLIENT_PROPOSAL_WEB_URL || '').replace(/\/$/, '');
    const client = (cart as any).client;
    const clientEmail = client?.email?.trim() || '';
    const clientName = client?.name?.trim() || 'Client';
    const clientSlug = slugifyClientNameForProposal(clientName);
    const date = formatCartCreatedDateForProposalUrl(cart.createdAt);
    const cartUuid = cart.id;

    const url = baseUrl
        ? buildProposalClientUrl(baseUrl, clientName, cart.createdAt, cartUuid)
        : `/proposals/${clientSlug}/${date}/${cartUuid}`;
    logger.info(
        `Proposal link: sending email (cartId=${cart.id}, proposalLinkId=${saved.id}, to=${clientEmail || 'n/a'}, url=${url})`
    );
    const emailResult = await sendProposalLinkEmail({
        toEmail: clientEmail,
        clientName,
        proposalUrl: url,
    });
    if (!emailResult.sent) {
        logger.warn(
            `Proposal link: email send failed (cartId=${cart.id}, proposalLinkId=${saved.id}, to=${clientEmail || 'n/a'}, error=${emailResult.error || 'unknown'})`
        );
    }

    return {
        proposalLinkId: saved.id,
        token,
        url,
        path: { clientSlug, date, cartId: cartUuid },
        emailSent: emailResult.sent,
        ...(emailResult.error && { emailError: emailResult.error }),
    };
}
