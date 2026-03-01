import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { listCarts, getCart, createCart, updateCart, deleteCart } from '../../../services/v1/admin/cart.service';

/**
 * GET /admin/cart - list all carts with pagination, search by client (name/email), filter by status.
 * Query: page, limit, search, status (generate | send | approved).
 */
export const listCartsController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const result = await listCarts({ page, limit, search, status });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin list carts error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/**
 * GET /admin/cart/:id - get single cart details (for refilling form before update).
 */
export const getCartController = async (req: Request, res: Response) => {
    try {
        const result = await getCart(req.params.id);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin get cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/**
 * POST /admin/cart - create or replace cart for a client. Body: clientId, managementFeePercent?, discountPercent?, items.
 */
export const createCartController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const clientId = body.clientId;
        const managementFeePercent = body.managementFeePercent;
        const discountPercent = body.discountPercent;
        const items = Array.isArray(body.items) ? body.items : [];
        const result = await createCart({
            clientId,
            managementFeePercent,
            discountPercent,
            items,
        });
        return res.status(HttpStatus.CREATED).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin create cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/**
 * PATCH /admin/cart/:id - update cart (pricing, items: price/notes/proofOfWork, add/remove influencers). Client cannot be changed.
 */
export const updateCartController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const result = await updateCart(req.params.id, {
            discountPercent: body.discountPercent,
            managementFeePercent: body.managementFeePercent,
            items: Array.isArray(body.items) ? body.items : undefined,
        });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin update cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/**
 * DELETE /admin/cart/:id - delete a cart and its items. Returns 204 on success.
 */
export const deleteCartController = async (req: Request, res: Response) => {
    try {
        await deleteCart(req.params.id);
        return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin delete cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
