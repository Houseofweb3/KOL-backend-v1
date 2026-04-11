import HttpStatus from 'http-status-codes';
import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { Influencer } from '../../../entity/influencer.entity';
import { CART_STATUS_DEFAULT, CartCurrency, CART_CURRENCY_DEFAULT, resolveCartCurrency } from '../../../constants/cart';
import {
    formatPriceRatioForDb,
    parseProposalRatioWithDefault,
    proposalUnitPriceFromSellPrice,
} from '../../../utils/cart-proposal-pricing';

/**
 * Build cart line `proofOfWork` URLs from influencer media/screenshots (no dedicated PoW column on influencers).
 * Order: collaboration images, then audience screenshots.
 */
function proofOfWorkUrlsFromInfluencer(inf: Influencer): string[] | null {
    const urls: string[] = [];
    const push = (u: string | null | undefined) => {
        const t = u?.trim();
        if (t) urls.push(t);
    };
    push(inf.ageScreenshotUrl);
    push(inf.genderScreenshotUrl);
    push(inf.topCountriesScreenshotUrl);
    return urls.length ? urls : null;
}

function cartCurrencyFromInput(raw: unknown): CartCurrency {
    try {
        return resolveCartCurrency(raw);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Invalid currency';
        const err = new Error(msg);
        (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
}

export interface CartItemDTO {
    id: string;
    influencerId: string;
    quantity: number;
    price: string;
}

export interface CartDTO {
    id: string;
    clientId: string;
    status: string;
    currency: CartCurrency;
    priceRatio: string | null;
    items: CartItemDTO[];
}

function mapCartToDto(cart: Cart, items: CartItem[]): CartDTO {
    return {
        id: cart.id,
        clientId: cart.clientId,
        status: cart.status,
        currency: (cart.currency as CartCurrency) ?? CART_CURRENCY_DEFAULT,
        priceRatio: cart.priceRatio ?? null,
        items: items.map((item) => ({
            id: item.id,
            influencerId: item.influencerId,
            quantity: item.quantity,
            price: item.price,
        })),
    };
}

/** Get existing cart for client (e.g. latest). Returns null if none. */
async function getLatestCartByClient(clientId: string): Promise<Cart | null> {
    const cartRepo = AppDataSource.getRepository(Cart);
    return cartRepo.findOne({
        where: { clientId },
        order: { createdAt: 'DESC' },
    });
}

export const getCartForClient = async (clientId: string): Promise<CartDTO> => {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    let cart = await getLatestCartByClient(clientId);
    if (!cart) {
        cart = cartRepo.create({ clientId, status: CART_STATUS_DEFAULT, currency: CART_CURRENCY_DEFAULT, priceRatio: null });
        cart = await cartRepo.save(cart);
    }
    const items = await itemRepo.find({ where: { cartId: cart.id } });
    return mapCartToDto(cart, items);
};

export const removeFromCart = async (clientId: string, influencerId: string): Promise<CartDTO> => {
    if (!influencerId) {
        const err = new Error('influencerId is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    const cart = await getLatestCartByClient(clientId);
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const item = await itemRepo.findOne({ where: { cartId: cart.id, influencerId } });
    if (!item) {
        const err = new Error('Cart item not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    await itemRepo.remove(item);

    const items = await itemRepo.find({ where: { cartId: cart.id } });
    return mapCartToDto(cart, items);
};

/** Payload item for createCart: influencerId + quantity; price is taken from Influencer.sellPrice. */
export interface CreateCartItemInput {
    influencerId: string;
    quantity: number;
}

/**
 * Create a new cart (new proposal) with the given items. Each call creates a new cart; no reuse, no delete.
 * Client id comes from auth. For each item: influencer must exist, not deleted, and have sellPrice.
 * Line `price` = sellPrice × ratio (ratio defaults to 1 when omitted).
 */
export const createCart = async (
    clientId: string,
    itemsInput: CreateCartItemInput[],
    currencyInput?: unknown,
    ratioInput?: unknown,
): Promise<CartDTO> => {
    if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
        const err = new Error('items array is required and must contain at least one entry');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const normalized: { influencerId: string; quantity: number }[] = [];
    for (let i = 0; i < itemsInput.length; i++) {
        const raw = itemsInput[i];
        const influencerId = raw?.influencerId != null ? String(raw.influencerId).trim() : '';
        const quantity = Number(raw?.quantity);
        if (!influencerId) {
            const err = new Error(`items[${i}]: influencerId is required`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            const err = new Error(`items[${i}]: quantity must be a positive number`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        normalized.push({ influencerId, quantity });
    }

    const influencerIds = [...new Set(normalized.map((n) => n.influencerId))];
    const influencerRepo = AppDataSource.getRepository(Influencer);
    const influencers = await influencerRepo.find({
        where: { id: In(influencerIds), isDeleted: false },
    });
    const influencerMap = new Map(influencers.map((inf) => [inf.id, inf]));

    for (const id of influencerIds) {
        const inf = influencerMap.get(id);
        if (!inf) {
            const err = new Error(`Influencer not found: ${id}`);
            (err as any).status = HttpStatus.NOT_FOUND;
            throw err;
        }
        if (!inf.sellPrice) {
            const err = new Error(`Influencer sellPrice is not configured: ${id}`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
    }

    const ratio = parseProposalRatioWithDefault(ratioInput, 1);

    const cartRepo = AppDataSource.getRepository(Cart);
    const cart = cartRepo.create({
        clientId,
        status: CART_STATUS_DEFAULT,
        currency: cartCurrencyFromInput(currencyInput),
        priceRatio: formatPriceRatioForDb(ratio),
    });
    const savedCart = await cartRepo.save(cart);

    const itemRepo = AppDataSource.getRepository(CartItem);
    const savedItems: CartItem[] = [];
    for (const { influencerId, quantity } of normalized) {
        const influencer = influencerMap.get(influencerId)!;
        const unitPrice = proposalUnitPriceFromSellPrice(influencer.sellPrice, ratio);
        const item = itemRepo.create({
            cartId: savedCart.id,
            influencerId,
            quantity,
            price: unitPrice,
            isApproved: true,
            notes: null,
            proofOfWork: proofOfWorkUrlsFromInfluencer(influencer),
        });
        const saved = await itemRepo.save(item);
        savedItems.push(saved);
    }

    return mapCartToDto(savedCart, savedItems);
};
