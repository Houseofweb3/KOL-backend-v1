import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { Client } from '../../../entity/client.entity';
import { Influencer } from '../../../entity/influencer.entity';
import { CartStatus, CART_STATUS_DEFAULT } from '../../../constants/cart';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const VALID_STATUSES: string[] = [CartStatus.GENERATE, CartStatus.SEND, CartStatus.APPROVED];

function normalizePriceForDecimal(raw: string | number | null | undefined): string {
    if (raw == null || String(raw).trim() === '') return '0.00';
    const cleaned = String(raw).replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num < 0) return '0.00';
    return num.toFixed(2);
}

export interface AdminCartItemDTO {
    id: string;
    influencerId: string;
    quantity: number;
    price: string;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

export interface AdminCartDTO {
    id: string;
    clientId: string;
    status: string;
    createdAt: string;
    subtotal: string;
    discountPercent: string;
    discountAmount: string;
    managementFeePercent: string;
    managementFeeAmount: string;
    total: string;
    client: {
        id: string;
        name: string;
        email: string;
    };
    items: AdminCartItemDTO[];
}

/** Payload item for admin create cart. */
export interface AdminCreateCartItemInput {
    influencerId: string;
    quantity: number;
    price: string | number;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

/** Payload for admin create cart (create/replace cart for client). */
export interface AdminCreateCartInput {
    clientId: string;
    managementFeePercent?: string | number;
    discountPercent?: string | number;
    items: AdminCreateCartItemInput[];
}

/** Update existing cart item (by cart_item id). All fields optional except id. */
export interface AdminUpdateCartItemInput {
    id: string;
    quantity?: number;
    price?: string | number;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

/** Add new line to cart (no id). */
export interface AdminAddCartItemInput {
    influencerId: string;
    quantity: number;
    price: string | number;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

/** Payload for admin update cart. Client cannot be changed. items = full desired set (updates + adds); omitted items are removed. */
export interface AdminUpdateCartInput {
    discountPercent?: string | number;
    managementFeePercent?: string | number;
    /** If provided: sync items (update by id, add by influencerId, remove if not listed). If omitted: keep existing items, only recalc totals from cart-level discount/fee. */
    items?: (AdminUpdateCartItemInput | AdminAddCartItemInput)[];
}

export interface ListCartsOptions {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

export interface ListCartsResult {
    carts: AdminCartDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const listCarts = async (options: ListCartsOptions = {}): Promise<ListCartsResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const statusFilter = options.status?.trim().toLowerCase() ?? '';

    const cartRepo = AppDataSource.getRepository(Cart);
    const qb = cartRepo
        .createQueryBuilder('cart')
        .leftJoinAndSelect('cart.client', 'client')
        .orderBy('cart.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
        qb.andWhere('cart.status = :status', { status: statusFilter });
    }
    if (search) {
        qb.andWhere(
            '(client.name ILike :search OR client.email ILike :search)',
            { search: `%${search}%` }
        );
    }

    const [carts, total] = await qb.getManyAndCount();

    const itemRepo = AppDataSource.getRepository(CartItem);
    const cartsWithItems: AdminCartDTO[] = [];
    for (const cart of carts) {
        const items = await itemRepo.find({
            where: { cartId: cart.id },
            order: { createdAt: 'ASC' },
        });
        const client = (cart as any).client;
        cartsWithItems.push(mapCartToAdminDto(cart, items, client));
    }

    return {
        carts: cartsWithItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

function mapCartToAdminDto(
    cart: Cart,
    items: CartItem[],
    client: { id: string; name: string; email: string } | null
): AdminCartDTO {
    return {
        id: cart.id,
        clientId: cart.clientId,
        status: cart.status,
        createdAt: cart.createdAt.toISOString(),
        subtotal: cart.subtotal ?? '0.00',
        discountPercent: cart.discountPercent ?? '0',
        discountAmount: cart.discountAmount ?? '0.00',
        managementFeePercent: cart.managementFeePercent ?? '0',
        managementFeeAmount: cart.managementFeeAmount ?? '0.00',
        total: cart.total ?? '0.00',
        client: client
            ? { id: client.id, name: client.name, email: client.email }
            : { id: cart.clientId, name: '', email: '' },
        items: items.map((item) => ({
            id: item.id,
            influencerId: item.influencerId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes ?? null,
            proofOfWork: item.proofOfWork ?? null,
        })),
    };
}

/**
 * Get a single cart by id (admin). Returns full cart with client and items. 404 if not found.
 */
export const getCart = async (cartId: string): Promise<AdminCartDTO> => {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    const cart = await cartRepo.findOne({ where: { id: cartId }, relations: ['client'] });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const items = await itemRepo.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
    const client = (cart as any).client;
    return mapCartToAdminDto(cart, items, client);
};

/**
 * Create or replace cart for a client (admin). One cart per client; replaces existing items and pricing.
 * Validates client and all influencers exist. Computes subtotal, discount, management fee, total.
 */
export const createCart = async (input: AdminCreateCartInput): Promise<AdminCartDTO> => {
    const { clientId, items: itemsInput } = input;
    if (!clientId?.trim()) {
        const err = new Error('clientId is required');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }
    if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
        const err = new Error('items array is required and must contain at least one entry');
        (err as any).status = HttpStatus.BAD_REQUEST;
        throw err;
    }

    const clientRepo = AppDataSource.getRepository(Client);
    const client = await clientRepo.findOne({ where: { id: clientId.trim(), isDeleted: false } });
    if (!client) {
        const err = new Error('Client not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }

    const influencerRepo = AppDataSource.getRepository(Influencer);
    const normalized: { influencerId: string; quantity: number; price: string; notes: string | null; proofOfWork: string[] | null }[] = [];
    for (let i = 0; i < itemsInput.length; i++) {
        const raw = itemsInput[i];
        const influencerId = raw?.influencerId != null ? String(raw.influencerId).trim() : '';
        const quantity = Number(raw?.quantity);
        const price = normalizePriceForDecimal(raw?.price);
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
        const inf = await influencerRepo.findOne({ where: { id: influencerId, isDeleted: false } });
        if (!inf) {
            const err = new Error(`Influencer not found: ${influencerId}`);
            (err as any).status = HttpStatus.NOT_FOUND;
            throw err;
        }
        const notes = raw.notes != null ? String(raw.notes).trim() || null : null;
        const proofOfWork = Array.isArray(raw.proofOfWork) ? raw.proofOfWork.filter((u): u is string => typeof u === 'string') : null;
        normalized.push({ influencerId, quantity, price, notes, proofOfWork: proofOfWork?.length ? proofOfWork : null });
    }

    const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
    const managementFeePercent = Math.max(0, Math.min(100, Number(input.managementFeePercent) ?? 15));

    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    let cart = await cartRepo.findOne({ where: { clientId: client.id } });
    if (cart) {
        await itemRepo.delete({ cartId: cart.id });
    } else {
        cart = cartRepo.create({
            clientId: client.id,
            status: CART_STATUS_DEFAULT,
            subtotal: '0',
            discountPercent: '0',
            discountAmount: '0',
            managementFeePercent: '15',
            managementFeeAmount: '0',
            total: '0',
        });
        cart = await cartRepo.save(cart);
    }

    let subtotalNum = 0;
    for (const { influencerId, quantity, price, notes, proofOfWork } of normalized) {
        const lineTotal = quantity * parseFloat(price);
        subtotalNum += lineTotal;
        const item = itemRepo.create({
            cartId: cart!.id,
            influencerId,
            quantity,
            price,
            notes,
            proofOfWork,
        });
        await itemRepo.save(item);
    }

    const subtotalStr = subtotalNum.toFixed(2);
    const discountAmountNum = subtotalNum * (discountPercent / 100);
    const afterDiscount = subtotalNum - discountAmountNum;
    const managementFeeAmountNum = afterDiscount * (managementFeePercent / 100);
    const totalNum = afterDiscount + managementFeeAmountNum;

    cart!.subtotal = subtotalStr;
    cart!.discountPercent = String(discountPercent);
    cart!.discountAmount = discountAmountNum.toFixed(2);
    cart!.managementFeePercent = String(managementFeePercent);
    cart!.managementFeeAmount = managementFeeAmountNum.toFixed(2);
    cart!.total = totalNum.toFixed(2);
    await cartRepo.save(cart!);

    const items = await itemRepo.find({ where: { cartId: cart!.id }, order: { createdAt: 'ASC' } });
    return mapCartToAdminDto(cart!, items, { id: client.id, name: client.name, email: client.email });
}

/**
 * Update a cart by id (admin). Client cannot be changed. Can update pricing (discount/fee), and/or sync items (update price/notes/proofOfWork, add new influencers, remove others).
 */
export const updateCart = async (cartId: string, input: AdminUpdateCartInput): Promise<AdminCartDTO> => {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    const clientRepo = AppDataSource.getRepository(Client);
    const influencerRepo = AppDataSource.getRepository(Influencer);

    const cart = await cartRepo.findOne({ where: { id: cartId }, relations: ['client'] });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    const client = (cart as any).client;
    const clientInfo = client
        ? { id: client.id, name: client.name, email: client.email }
        : { id: cart.clientId, name: '', email: '' };

    const discountPercent =
        input.discountPercent !== undefined
            ? Math.max(0, Math.min(100, Number(input.discountPercent) ?? 0))
            : parseFloat(String(cart.discountPercent ?? '0'));
    const managementFeePercent =
        input.managementFeePercent !== undefined
            ? Math.max(0, Math.min(100, Number(input.managementFeePercent) ?? 15))
            : parseFloat(String(cart.managementFeePercent ?? '15'));

    if (input.items === undefined) {
        // Only update cart-level percentages; recalc totals from existing items
        const items = await itemRepo.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
        let subtotalNum = 0;
        for (const item of items) {
            subtotalNum += item.quantity * parseFloat(String(item.price));
        }
        const subtotalStr = subtotalNum.toFixed(2);
        const discountAmountNum = subtotalNum * (discountPercent / 100);
        const afterDiscount = subtotalNum - discountAmountNum;
        const managementFeeAmountNum = afterDiscount * (managementFeePercent / 100);
        const totalNum = afterDiscount + managementFeeAmountNum;
        cart.subtotal = subtotalStr;
        cart.discountPercent = String(discountPercent);
        cart.discountAmount = discountAmountNum.toFixed(2);
        cart.managementFeePercent = String(managementFeePercent);
        cart.managementFeeAmount = managementFeeAmountNum.toFixed(2);
        cart.total = totalNum.toFixed(2);
        await cartRepo.save(cart);
        const itemsAfter = await itemRepo.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
        return mapCartToAdminDto(cart, itemsAfter, clientInfo);
    }

    const itemsInput = input.items;
    const updateList: AdminUpdateCartItemInput[] = [];
    const addList: AdminAddCartItemInput[] = [];
    for (const it of itemsInput) {
        if (it && typeof it === 'object' && 'id' in it && (it as any).id) {
            updateList.push(it as AdminUpdateCartItemInput);
        } else if (it && typeof it === 'object' && (it as any).influencerId) {
            addList.push(it as AdminAddCartItemInput);
        }
    }

    const existingItems = await itemRepo.find({ where: { cartId: cart.id } });
    const existingIds = new Set(existingItems.map((i) => i.id));
    const keepIds = new Set(updateList.map((u) => u.id.trim()).filter(Boolean));

    for (const u of updateList) {
        if (!existingIds.has(u.id)) {
            const err = new Error(`Cart item not found: ${u.id}`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
    }

    // Remove items not in keepIds
    for (const item of existingItems) {
        if (!keepIds.has(item.id)) {
            await itemRepo.remove(item);
        }
    }

    // Update existing
    for (const u of updateList) {
        const item = existingItems.find((i) => i.id === u.id)!;
        if (u.quantity !== undefined) {
            const q = Number(u.quantity);
            if (!Number.isFinite(q) || q <= 0) {
                const err = new Error(`Item ${u.id}: quantity must be a positive number`);
                (err as any).status = HttpStatus.BAD_REQUEST;
                throw err;
            }
            item.quantity = q;
        }
        if (u.price !== undefined) item.price = normalizePriceForDecimal(u.price);
        if (u.notes !== undefined) item.notes = u.notes != null ? String(u.notes).trim() || null : null;
        if (u.proofOfWork !== undefined) {
            item.proofOfWork = Array.isArray(u.proofOfWork) ? u.proofOfWork.filter((x): x is string => typeof x === 'string') : null;
        }
        await itemRepo.save(item);
    }

    // Add new
    for (let i = 0; i < addList.length; i++) {
        const raw = addList[i];
        const influencerId = String(raw.influencerId).trim();
        const quantity = Number(raw.quantity);
        const price = normalizePriceForDecimal(raw.price);
        if (!influencerId) {
            const err = new Error(`items[${i}]: influencerId is required for new item`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            const err = new Error(`items[${i}]: quantity must be a positive number`);
            (err as any).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        const inf = await influencerRepo.findOne({ where: { id: influencerId, isDeleted: false } });
        if (!inf) {
            const err = new Error(`Influencer not found: ${influencerId}`);
            (err as any).status = HttpStatus.NOT_FOUND;
            throw err;
        }
        const notes = raw.notes != null ? String(raw.notes).trim() || null : null;
        const proofOfWork = Array.isArray(raw.proofOfWork) ? raw.proofOfWork.filter((u): u is string => typeof u === 'string') : null;
        const newItem = itemRepo.create({
            cartId: cart.id,
            influencerId,
            quantity,
            price,
            notes: notes ?? undefined,
            proofOfWork: proofOfWork?.length ? proofOfWork : null,
        });
        await itemRepo.save(newItem);
    }

    // Recalc totals
    const items = await itemRepo.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
    let subtotalNum = 0;
    for (const item of items) {
        subtotalNum += item.quantity * parseFloat(String(item.price));
    }
    const subtotalStr = subtotalNum.toFixed(2);
    const discountAmountNum = subtotalNum * (discountPercent / 100);
    const afterDiscount = subtotalNum - discountAmountNum;
    const managementFeeAmountNum = afterDiscount * (managementFeePercent / 100);
    const totalNum = afterDiscount + managementFeeAmountNum;
    cart.subtotal = subtotalStr;
    cart.discountPercent = String(discountPercent);
    cart.discountAmount = discountAmountNum.toFixed(2);
    cart.managementFeePercent = String(managementFeePercent);
    cart.managementFeeAmount = managementFeeAmountNum.toFixed(2);
    cart.total = totalNum.toFixed(2);
    await cartRepo.save(cart);

    const itemsAfter = await itemRepo.find({ where: { cartId: cart.id }, order: { createdAt: 'ASC' } });
    return mapCartToAdminDto(cart, itemsAfter, clientInfo);
};

/**
 * Delete a cart by id (admin). Removes all cart items then the cart. Returns 404 if not found.
 */
export const deleteCart = async (cartId: string): Promise<void> => {
    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    const cart = await cartRepo.findOne({ where: { id: cartId } });
    if (!cart) {
        const err = new Error('Cart not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    await itemRepo.delete({ cartId: cart.id });
    await cartRepo.remove(cart);
}
