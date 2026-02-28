import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { CartCampaignDetails } from '../../../entity/cart-campaign-details.entity';
import { Influencer } from '../../../entity/influencer.entity';

export interface CartItemDTO {
    id: string;
    influencerId: string;
    quantity: number;
    price: string;
}

export interface CartDTO {
    id: string;
    clientId: string;
    items: CartItemDTO[];
}

function mapCartToDto(cart: Cart, items: CartItem[]): CartDTO {
    return {
        id: cart.id,
        clientId: cart.clientId,
        items: items.map((item) => ({
            id: item.id,
            influencerId: item.influencerId,
            quantity: item.quantity,
            price: item.price,
        })),
    };
}

async function getOrCreateCart(clientId: string): Promise<Cart> {
    const cartRepo = AppDataSource.getRepository(Cart);
    let cart = await cartRepo.findOne({ where: { clientId } });
    if (!cart) {
        cart = cartRepo.create({ clientId });
        cart = await cartRepo.save(cart);
    }
    return cart;
}

export const getCartForClient = async (clientId: string): Promise<CartDTO> => {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    let cart = await cartRepo.findOne({ where: { clientId } });
    if (!cart) {
        cart = cartRepo.create({ clientId });
        cart = await cartRepo.save(cart);
    }
    const items = await itemRepo.find({ where: { cartId: cart.id } });
    return mapCartToDto(cart, items);
};

export const addToCart = async (clientId: string, influencerId: string, quantity: number): Promise<CartDTO> => {
    if (!influencerId) {
        const err = new Error('influencerId is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        const err = new Error('quantity must be a positive number');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const influencerRepo = AppDataSource.getRepository(Influencer);
    const influencer = await influencerRepo.findOne({ where: { id: influencerId, isDeleted: false } });
    if (!influencer) {
        const err = new Error('Influencer not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (!influencer.sellPrice) {
        const err = new Error('Influencer sellPrice is not configured');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const cart = await getOrCreateCart(clientId);
    const itemRepo = AppDataSource.getRepository(CartItem);

    let item = await itemRepo.findOne({ where: { cartId: cart.id, influencerId } });
    if (item) {
        item.quantity += quantity;
        item.price = influencer.sellPrice;
    } else {
        item = itemRepo.create({
            cartId: cart.id,
            influencerId,
            quantity,
            price: influencer.sellPrice,
        });
    }
    await itemRepo.save(item);

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

    const cart = await cartRepo.findOne({ where: { clientId } });
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

export const updateCartItem = async (clientId: string, influencerId: string, quantity: number): Promise<CartDTO> => {
    if (!influencerId) {
        const err = new Error('influencerId is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!Number.isFinite(quantity)) {
        const err = new Error('quantity must be a number');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);

    const cart = await cartRepo.findOne({ where: { clientId } });
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

    if (quantity <= 0) {
        await itemRepo.remove(item);
    } else {
        item.quantity = quantity;
        await itemRepo.save(item);
    }

    const items = await itemRepo.find({ where: { cartId: cart.id } });
    return mapCartToDto(cart, items);
};

/** Payload item for createCart: influencerId + quantity; price is taken from Influencer.sellPrice. */
export interface CreateCartItemInput {
    influencerId: string;
    quantity: number;
}

/**
 * Create or replace cart with multiple items in one request.
 * Client id comes from auth. For each item: influencer must exist, not deleted, and have sellPrice.
 * Existing cart items are replaced by the given list (same influencer id can appear once; quantity is used as given).
 */
/** Optional campaign/contact details; clientId and cartId set by backend. */
export interface CreateCartCampaignInput {
    name?: string | null;
    projectName?: string | null;
    projectUrl?: string | null;
    email?: string | null;
    telegramId?: string | null;
    whatsAppNumber?: string | null;
}

export const createCart = async (
    clientId: string,
    itemsInput: CreateCartItemInput[],
    campaignInput?: CreateCartCampaignInput | null,
): Promise<CartDTO> => {
    if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
        const err = new Error('items array is required and must contain at least one entry');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const influencerRepo = AppDataSource.getRepository(Influencer);
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

    // Resolve all influencers and prices (required for cart item: influencerId, quantity, price from entity)
    const influencerIds = [...new Set(normalized.map((n) => n.influencerId))];
    const influencers = await influencerRepo.find({
        where: influencerIds.map((id) => ({ id, isDeleted: false })),
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

    const cart = await getOrCreateCart(clientId);
    const itemRepo = AppDataSource.getRepository(CartItem);

    await itemRepo.delete({ cartId: cart.id });

    for (const { influencerId, quantity } of normalized) {
        const influencer = influencerMap.get(influencerId)!;
        const item = itemRepo.create({
            cartId: cart.id,
            influencerId,
            quantity,
            price: influencer.sellPrice!,
        });
        await itemRepo.save(item);
    }

    if (campaignInput != null && typeof campaignInput === 'object') {
        const campaignRepo = AppDataSource.getRepository(CartCampaignDetails);
        const existing = await campaignRepo.findOne({ where: { cartId: cart.id } });
        const payload = {
            name: campaignInput.name != null ? String(campaignInput.name).trim() || null : null,
            projectName: campaignInput.projectName != null ? String(campaignInput.projectName).trim() || null : null,
            projectUrl: campaignInput.projectUrl != null ? String(campaignInput.projectUrl).trim() || null : null,
            email: campaignInput.email != null ? String(campaignInput.email).trim() || null : null,
            telegramId: campaignInput.telegramId != null ? String(campaignInput.telegramId).trim() || null : null,
            whatsAppNumber: campaignInput.whatsAppNumber != null ? String(campaignInput.whatsAppNumber).trim() || null : null,
            clientId,
            cartId: cart.id,
        };
        if (existing) {
            Object.assign(existing, payload);
            await campaignRepo.save(existing);
        } else {
            const campaign = campaignRepo.create(payload);
            await campaignRepo.save(campaign);
        }
    }

    const items = await itemRepo.find({ where: { cartId: cart.id } });
    return mapCartToDto(cart, items);
};