import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { ProposalLink } from '../../../entity/proposal-link.entity';
import { BillingInfo } from '../../../entity/billing-info.entity';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { CartStatus } from '../../../constants/cart';
import { verifyProposalToken } from '../../v1/admin/proposal-link.service';
import { getCart } from '../../v1/admin/cart.service';
import {
    formatCartCreatedDateForProposalUrl,
    slugifyClientNameForProposal,
} from '../../../utils/proposal-url';
import type { AdminCartDTO } from '../../v1/admin/cart.service';
import type { PaymentMode } from '../../../entity/billing-info.entity';

export interface ProposalCartResult {
    cart: AdminCartDTO;
}

type CartWithClient = Cart & { client?: { name: string } };

/**
 * Resolves an active proposal link when the URL path matches the cart (client slug, cart createdAt UTC date, cart id).
 * No JWT: access is gated by knowing cart UUID + matching slug/date + unused proposal_links row.
 */
async function resolveActiveProposalLinkFromSlugPath(
    clientSlug: string,
    dateYmd: string,
    cartId: string,
): Promise<ProposalLink> {
    const cartRepo = AppDataSource.getRepository(Cart);
    const cart = await cartRepo.findOne({ where: { id: cartId }, relations: ['client'] });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const clientName = (cart as CartWithClient).client?.name ?? '';
    const expectedSlug = slugifyClientNameForProposal(clientName);
    const pathSlug = slugifyClientNameForProposal(clientSlug);
    if (expectedSlug !== pathSlug) {
        const err = new Error('Invalid proposal link');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const expectedDate = formatCartCreatedDateForProposalUrl(cart.createdAt);
    if (expectedDate !== dateYmd) {
        const err = new Error('Invalid proposal link');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const linkRepo = AppDataSource.getRepository(ProposalLink);
    const link = await linkRepo.findOne({
        where: { cartId: cart.id },
        order: { createdAt: 'DESC' },
    });
    if (!link) {
        const err = new Error('Proposal link not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (link.usedAt) {
        const err = new Error('This proposal link has already been used');
        (err as any).status = HttpStatus.GONE;
        throw err;
    }
    if (link.clientId !== cart.clientId) {
        const err = new Error('Invalid proposal link');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return link;
}

/**
 * Same as getProposalCart but identifies the cart from the readable path (no query token).
 */
export async function getProposalCartBySlugPath(
    clientSlug: string,
    dateYmd: string,
    cartId: string,
): Promise<ProposalCartResult> {
    const link = await resolveActiveProposalLinkFromSlugPath(clientSlug, dateYmd, cartId);
    const cart = await getCart(link.cartId);
    return { cart };
}

/**
 * Validate token and return cart data for proposal page. Throws if token invalid or link already used.
 */
export async function getProposalCart(token: string): Promise<ProposalCartResult> {
    const payload = verifyProposalToken(token);
    const linkRepo = AppDataSource.getRepository(ProposalLink);

    const link = await linkRepo.findOne({
        where: { id: payload.proposalLinkId },
    });
    if (!link) {
        const err = new Error('Proposal link not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (link.usedAt) {
        const err = new Error('This proposal link has already been used');
        (err as any).status = HttpStatus.GONE;
        throw err;
    }
    if (link.cartId !== payload.cartId || link.clientId !== payload.clientId) {
        const err = new Error('Invalid proposal token');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const cart = await getCart(link.cartId);
    return { cart };
}

/** Per-item acceptance: cart item id and whether client accepted this influencer line. */
export interface ProposalItemAcceptInput {
    id: string;
    accepted: boolean;
}

export interface BillingInfoInput {
    /** Cart item accept/reject: each item id with accepted true/false. */
    items: ProposalItemAcceptInput[];
    registeredCompanyName: string;
    registeredCompanyAddress: string;
    authorizedSignatoryName: string;
    authorizedSignatoryDesignation: string;
    officialEmailId: string;
    phoneNumber: string;
    preferredPaymentMode: PaymentMode;
    docusignProofLink?: string | null;
    isTermsConfirmed: boolean;
}

export interface SubmitProposalResult {
    success: true;
    message: string;
}

/**
 * Submit proposal: update cart items (accepted true/false), set cart status to approved, save billing info, mark link as used.
 * Caller must have validated the link (JWT path or slug path).
 */
async function submitProposalWithLink(link: ProposalLink, input: BillingInfoInput): Promise<SubmitProposalResult> {
    const linkRepo = AppDataSource.getRepository(ProposalLink);
    const billingRepo = AppDataSource.getRepository(BillingInfo);
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    if (!input.isTermsConfirmed) {
        const err = new Error('Terms and conditions must be confirmed');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const cartItems = await itemRepo.find({ where: { cartId: link.cartId } });
    const itemById = new Map(cartItems.map((i) => [i.id, i]));
    if (Array.isArray(input.items)) {
        for (const { id: itemId, accepted } of input.items) {
            const item = itemById.get(itemId);
            if (item) {
                item.isApproved = !!accepted;
                await itemRepo.save(item);
            }
        }
    }

    const cart = await cartRepo.findOne({ where: { id: link.cartId } });
    if (cart) {
        cart.status = CartStatus.APPROVED;
        const acceptedItems = cartItems.filter((i) => i.isApproved);
        const subtotalNum = acceptedItems.reduce((sum, i) => sum + (i.quantity ?? 1) * parseFloat(String(i.price ?? '0')), 0);
        const discountPercent = parseFloat(String(cart.discountPercent ?? '0'));
        const managementFeePercent = parseFloat(String(cart.managementFeePercent ?? '15'));
        const discountAmountNum = subtotalNum * (discountPercent / 100);
        const afterDiscount = subtotalNum - discountAmountNum;
        const managementFeeAmountNum = afterDiscount * (managementFeePercent / 100);
        const totalNum = afterDiscount + managementFeeAmountNum;
        cart.subtotal = subtotalNum.toFixed(2);
        cart.discountAmount = discountAmountNum.toFixed(2);
        cart.managementFeeAmount = managementFeeAmountNum.toFixed(2);
        cart.total = totalNum.toFixed(2);
        await cartRepo.save(cart);
    }

    const mode = input.preferredPaymentMode === 'bank_transfer' || input.preferredPaymentMode === 'crypto'
        ? input.preferredPaymentMode
        : 'bank_transfer';

    let billing = await billingRepo.findOne({ where: { cartId: link.cartId } });
    if (billing) {
        billing.registeredCompanyName = input.registeredCompanyName.trim();
        billing.registeredCompanyAddress = input.registeredCompanyAddress.trim();
        billing.authorizedSignatoryName = input.authorizedSignatoryName.trim();
        billing.authorizedSignatoryDesignation = input.authorizedSignatoryDesignation.trim();
        billing.officialEmailId = input.officialEmailId.trim();
        billing.phoneNumber = input.phoneNumber.trim();
        billing.preferredPaymentMode = mode;
        billing.docusignProofLink = input.docusignProofLink?.trim() || null;
        billing.isTermsConfirmed = true;
    } else {
        billing = billingRepo.create({
            cartId: link.cartId,
            registeredCompanyName: input.registeredCompanyName.trim(),
            registeredCompanyAddress: input.registeredCompanyAddress.trim(),
            authorizedSignatoryName: input.authorizedSignatoryName.trim(),
            authorizedSignatoryDesignation: input.authorizedSignatoryDesignation.trim(),
            officialEmailId: input.officialEmailId.trim(),
            phoneNumber: input.phoneNumber.trim(),
            preferredPaymentMode: mode,
            docusignProofLink: input.docusignProofLink?.trim() || null,
            isTermsConfirmed: true,
        });
    }
    await billingRepo.save(billing);

    link.usedAt = new Date();
    await linkRepo.save(link);

    return { success: true, message: 'Proposal confirmed successfully' };
}

export async function submitProposal(token: string, input: BillingInfoInput): Promise<SubmitProposalResult> {
    const payload = verifyProposalToken(token);
    const linkRepo = AppDataSource.getRepository(ProposalLink);
    const link = await linkRepo.findOne({ where: { id: payload.proposalLinkId } });
    if (!link) {
        const err = new Error('Proposal link not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (link.usedAt) {
        const err = new Error('This proposal link has already been used');
        (err as any).status = HttpStatus.GONE;
        throw err;
    }
    if (link.cartId !== payload.cartId || link.clientId !== payload.clientId) {
        const err = new Error('Invalid proposal token');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    return submitProposalWithLink(link, input);
}

/**
 * Submit proposal using readable path only (slug + date + cart id); no JWT.
 */
export async function submitProposalBySlugPath(
    clientSlug: string,
    dateYmd: string,
    cartId: string,
    input: BillingInfoInput,
): Promise<SubmitProposalResult> {
    const link = await resolveActiveProposalLinkFromSlugPath(clientSlug, dateYmd, cartId);
    return submitProposalWithLink(link, input);
}
