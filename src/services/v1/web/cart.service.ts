import HttpStatus from 'http-status-codes';
import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { Influencer } from '../../../entity/influencer.entity';
import { CART_STATUS_DEFAULT } from '../../../constants/cart';

/** Normalize price string (e.g. "$200" or "1,200.50") to decimal-safe string for CartItem.price column. */
function normalizePriceForDecimal(raw: string | null | undefined): string {
    if (raw == null || String(raw).trim() === '') return '0.00';
    const cleaned = String(raw).replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num < 0) return '0.00';
    return num.toFixed(2);
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
    items: CartItemDTO[];
}

function mapCartToDto(cart: Cart, items: CartItem[]): CartDTO {
    return {
        id: cart.id,
        clientId: cart.clientId,
        status: cart.status,
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
        cart = cartRepo.create({ clientId, status: CART_STATUS_DEFAULT });
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
 */
export const createCart = async (
    clientId: string,
    itemsInput: CreateCartItemInput[],
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

    const cartRepo = AppDataSource.getRepository(Cart);
    const cart = cartRepo.create({ clientId, status: CART_STATUS_DEFAULT });
    const savedCart = await cartRepo.save(cart);

    const itemRepo = AppDataSource.getRepository(CartItem);
    const savedItems: CartItem[] = [];
    for (const { influencerId, quantity } of normalized) {
        const influencer = influencerMap.get(influencerId)!;
        const item = itemRepo.create({
            cartId: savedCart.id,
            influencerId,
            quantity,
            price: normalizePriceForDecimal(influencer.sellPrice),
            isApproved: true,
            notes: null,
            proofOfWork: null,
        });
        const saved = await itemRepo.save(item);
        savedItems.push(saved);
    }

    return mapCartToDto(savedCart, savedItems);
};