import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart.entity';
import { CartItem } from '../../../entity/cart-item.entity';
import { Client } from '../../../entity/client.entity';
import { Influencer } from '../../../entity/influencer.entity';
import {
    CartStatus,
    CART_STATUS_DEFAULT,
    CartCurrency,
    CART_CURRENCY_DEFAULT,
    resolveCartCurrency,
} from '../../../constants/cart';
import {
    formatPriceRatioForDb,
    parseProposalRatioFromBody,
    proposalUnitPriceFromSellPrice,
} from '../../../utils/cart-proposal-pricing';
import type { Repository } from 'typeorm';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const VALID_STATUSES: string[] = [CartStatus.GENERATE, CartStatus.SEND, CartStatus.UPDATED, CartStatus.APPROVED];

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

function normalizePriceForDecimal(raw: string | number | null | undefined): string {
    if (raw == null || String(raw).trim() === '') return '0.00';
    const cleaned = String(raw).replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num < 0) return '0.00';
    return num.toFixed(2);
}

async function reapplyProposalPricesFromSellPriceAndRatio(
    cartId: string,
    ratio: number,
    itemRepo: Repository<CartItem>,
): Promise<void> {
    const items = await itemRepo.find({ where: { cartId }, relations: ['influencer'] });
    for (const item of items) {
        const inf = (item as CartItem & { influencer?: Influencer }).influencer;
        if (!inf?.sellPrice) {
            const err = new Error(`Influencer ${item.influencerId} has no sell price; cannot apply ratio`);
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
        item.price = proposalUnitPriceFromSellPrice(inf.sellPrice, ratio);
        await itemRepo.save(item);
    }
}

export interface AdminCartItemDTO {
    id: string;
    influencerId: string;
    quantity: number;
    price: string;
    notes?: string | null;
    proofOfWork?: string[] | null;
    isApproved?: boolean;
    /** From influencer (included when items are loaded with influencer relation). */
    platform?: string | null;
    platformLink?: string | null;
    inventory?: string | null;
    influencerName?: string | null;
}

export interface AdminCartDTO {
    id: string;
    clientId: string;
    status: string;
    currency: CartCurrency;
    /** Sell-price multiplier used for line proposal amounts; null if lines used explicit prices only. */
    priceRatio: string | null;
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
    /**
     * Optional when backend is ratio-converting (INR/AED) or when you want to use influencer.sellPrice directly (USD).
     * When provided, backend normalizes it and uses it as the line unit price.
     */
    price?: string | number;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

/** Payload for admin create cart (create/replace cart for client). */
export interface AdminCreateCartInput {
    clientId: string;
    /** One of USD, INR, AED. Defaults to USD when omitted. */
    currency?: string;
    /**
     * Required when `currency` is INR or AED (frontend sends the same rate shown in UI; backend does not fetch live rates).
     * Optional when `currency` is USD: if set, line price = sellPrice × ratio (markup); if omitted, use item `price` or sellPrice × 1.
     */
    ratio?: string | number;
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
    /**
     * Optional when backend is ratio-converting (INR/AED) or when using current cart currency.
     * When omitted, backend uses influencer.sellPrice (USD) or influencer.sellPrice × cart.priceRatio (if present).
     */
    price?: string | number;
    notes?: string | null;
    proofOfWork?: string[] | null;
}

/** Payload for admin update cart. Client cannot be changed. items = full desired set (updates + adds); omitted items are removed. */
export interface AdminUpdateCartInput {
    /** When set, must be USD, INR, or AED. */
    currency?: string;
    /**
     * When changing currency to INR/AED, send the same `ratio` the frontend used (required). Backend does not fetch live rates.
     * When changing currency to USD without `ratio`, lines are recalculated as sellPrice × 1.
     */
    ratio?: string | number;
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
            relations: ['influencer'],
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
        currency: (cart.currency as CartCurrency) ?? CART_CURRENCY_DEFAULT,
        priceRatio: cart.priceRatio ?? null,
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
        items: items.map((item) => {
            const inf = (item as any).influencer;
            return {
                id: item.id,
                influencerId: item.influencerId,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes ?? null,
                proofOfWork: item.proofOfWork ?? null,
                isApproved: item.isApproved ?? false,
                platform: inf?.platform ?? null,
                platformLink: inf?.platformLink ?? null,
                inventory: inf?.inventory ?? null,
                influencerName: inf?.name ?? null,
            };
        }),
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
    const items = await itemRepo.find({
        where: { cartId: cart.id },
        relations: ['influencer'],
        order: { createdAt: 'ASC' },
    });
    const client = (cart as any).client;
    return mapCartToAdminDto(cart, items, client);
};

/**
 * Create a new cart (new proposal) for a client (admin). Each call creates a new cart; no reuse, no delete.
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

    const cartCurrency = cartCurrencyFromInput(input.currency);

    let ratioNum: number | null = null;
    if (cartCurrency !== CART_CURRENCY_DEFAULT) {
        // sellPrice is USD; INR/AED lines = sellPrice × ratio. Ratio must come from frontend (e.g. after GET /admin/rate).
        ratioNum = parseProposalRatioFromBody(input.ratio);
    } else if (input.ratio !== undefined) {
        ratioNum = parseProposalRatioFromBody(input.ratio);
    }

    const influencerRepo = AppDataSource.getRepository(Influencer);
    const normalized: { influencerId: string; quantity: number; price: string; notes: string | null; proofOfWork: string[] | null }[] = [];
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
        const inf = await influencerRepo.findOne({ where: { id: influencerId, isDeleted: false } });
        if (!inf) {
            const err = new Error(`Influencer not found: ${influencerId}`);
            (err as any).status = HttpStatus.NOT_FOUND;
            throw err;
        }
        let price: string;
        if (ratioNum != null) {
            if (!inf.sellPrice) {
                const err = new Error(`items[${i}]: influencer has no sell price; required when ratio is set`);
                (err as any).status = HttpStatus.BAD_REQUEST;
                throw err;
            }
            price = proposalUnitPriceFromSellPrice(inf.sellPrice, ratioNum);
        } else {
            if (raw?.price !== undefined && String(raw.price).trim() !== '') {
                price = normalizePriceForDecimal(raw.price);
            } else {
                // Default behavior: use influencer.sellPrice directly (USD) when admin currency is USD.
                if (!inf.sellPrice) {
                    const err = new Error(`items[${i}]: influencer has no sell price and price is required`);
                    (err as any).status = HttpStatus.BAD_REQUEST;
                    throw err;
                }
                price = proposalUnitPriceFromSellPrice(inf.sellPrice, 1);
            }
        }
        const notes = raw.notes != null ? String(raw.notes).trim() || null : null;
        const proofOfWork = Array.isArray(raw.proofOfWork) ? raw.proofOfWork.filter((u): u is string => typeof u === 'string') : null;
        normalized.push({ influencerId, quantity, price, notes, proofOfWork: proofOfWork?.length ? proofOfWork : null });
    }

    const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
    const managementFeePercent = Math.max(0, Math.min(100, Number(input.managementFeePercent) ?? 15));

    const cartRepo = AppDataSource.getRepository(Cart);
    const itemRepo = AppDataSource.getRepository(CartItem);
    const cart = cartRepo.create({
        clientId: client.id,
        status: CART_STATUS_DEFAULT,
        currency: cartCurrency,
        priceRatio: ratioNum != null ? formatPriceRatioForDb(ratioNum) : null,
        subtotal: '0',
        discountPercent: '0',
        discountAmount: '0',
        managementFeePercent: '15',
        managementFeeAmount: '0',
        total: '0',
    });
    const savedCart = await cartRepo.save(cart);

    let subtotalNum = 0;
    for (const { influencerId, quantity, price, notes, proofOfWork } of normalized) {
        const lineTotal = quantity * parseFloat(price);
        subtotalNum += lineTotal;
        const item = itemRepo.create({
            cartId: savedCart.id,
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

    savedCart.subtotal = subtotalStr;
    savedCart.discountPercent = String(discountPercent);
    savedCart.discountAmount = discountAmountNum.toFixed(2);
    savedCart.managementFeePercent = String(managementFeePercent);
    savedCart.managementFeeAmount = managementFeeAmountNum.toFixed(2);
    savedCart.total = totalNum.toFixed(2);
    await cartRepo.save(savedCart);

    const items = await itemRepo.find({
        where: { cartId: savedCart.id },
        relations: ['influencer'],
        order: { createdAt: 'ASC' },
    });
    return mapCartToAdminDto(savedCart, items, { id: client.id, name: client.name, email: client.email });
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

    const originalCurrency = cart.currency;
    const targetCurrency = input.currency !== undefined ? cartCurrencyFromInput(input.currency) : originalCurrency;

    let ratioToApply: number | null = null;
    if (input.ratio !== undefined) {
        ratioToApply = parseProposalRatioFromBody(input.ratio);
    } else if (input.currency !== undefined && targetCurrency !== originalCurrency) {
        if (targetCurrency === CART_CURRENCY_DEFAULT) {
            ratioToApply = 1;
        } else {
            const err = new Error('ratio is required when changing cart currency to INR or AED (use the same value shown on the frontend)');
            (err as { status?: number }).status = HttpStatus.BAD_REQUEST;
            throw err;
        }
    }

    if (input.currency !== undefined) {
        cart.currency = targetCurrency;
    }

    if (input.items === undefined) {
        // Only update cart-level percentages; recalc totals from existing items
        if (ratioToApply != null) {
            await reapplyProposalPricesFromSellPriceAndRatio(cart.id, ratioToApply, itemRepo);
            cart.priceRatio = formatPriceRatioForDb(ratioToApply);
        }
        const items = await itemRepo.find({
            where: { cartId: cart.id },
            relations: ['influencer'],
            order: { createdAt: 'ASC' },
        });
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
        cart.status = CartStatus.UPDATED;
        await cartRepo.save(cart);
        const itemsAfter = await itemRepo.find({
            where: { cartId: cart.id },
            relations: ['influencer'],
            order: { createdAt: 'ASC' },
        });
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
        if (ratioToApply == null && u.price !== undefined) item.price = normalizePriceForDecimal(u.price);
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
        let priceForLine: string;
        if (ratioToApply != null) {
            if (!inf.sellPrice) {
                const err = new Error(`items[${i}]: influencer has no sell price; required when ratio is set`);
                (err as any).status = HttpStatus.BAD_REQUEST;
                throw err;
            }
            priceForLine = proposalUnitPriceFromSellPrice(inf.sellPrice, ratioToApply);
        } else {
            // If admin provided explicit price, use it. Otherwise derive from influencer.sellPrice using:
            // - current cart.priceRatio (if present), else ratio 1 (USD).
            if (raw.price !== undefined && String(raw.price).trim() !== '') {
                priceForLine = normalizePriceForDecimal(raw.price);
            } else {
                if (!inf.sellPrice) {
                    const err = new Error(`items[${i}]: influencer has no sell price; required when price is omitted`);
                    (err as any).status = HttpStatus.BAD_REQUEST;
                    throw err;
                }
                const cartRatio = cart.priceRatio != null ? parseFloat(String(cart.priceRatio)) : 1;
                if (!Number.isFinite(cartRatio) || cartRatio <= 0) {
                    const err = new Error(`Invalid cart priceRatio; cannot derive price for items[${i}]`);
                    (err as any).status = HttpStatus.INTERNAL_SERVER_ERROR;
                    throw err;
                }
                priceForLine = proposalUnitPriceFromSellPrice(inf.sellPrice, cartRatio);
            }
        }
        const notes = raw.notes != null ? String(raw.notes).trim() || null : null;
        const proofOfWork = Array.isArray(raw.proofOfWork) ? raw.proofOfWork.filter((u): u is string => typeof u === 'string') : null;
        const newItem = itemRepo.create({
            cartId: cart.id,
            influencerId,
            quantity,
            price: priceForLine,
            notes: notes ?? undefined,
            proofOfWork: proofOfWork?.length ? proofOfWork : null,
        });
        await itemRepo.save(newItem);
    }

    if (ratioToApply != null) {
        await reapplyProposalPricesFromSellPriceAndRatio(cart.id, ratioToApply, itemRepo);
        cart.priceRatio = formatPriceRatioForDb(ratioToApply);
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
    cart.status = CartStatus.UPDATED;
    await cartRepo.save(cart);

    const itemsAfter = await itemRepo.find({
        where: { cartId: cart.id },
        relations: ['influencer'],
        order: { createdAt: 'ASC' },
    });
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
