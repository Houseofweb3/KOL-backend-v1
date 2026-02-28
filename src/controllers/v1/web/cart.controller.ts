import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    addToCart,
    createCart,
    getCartForClient,
    removeFromCart,
    updateCartItem,
} from '../../../services/v1/web/cart.service';

type AuthedRequest = Request & {
    client?: {
        id: string;
        email?: string;
    };
};

export const getCartController = async (req: AuthedRequest, res: Response) => {
    try {
        const client = req.client;
        if (!client) {
            return res
                .status(HttpStatus.UNAUTHORIZED)
                .json({ error: 'Client context is missing from request. Is auth middleware applied?' });
        }
        const cart = await getCartForClient(client.id);
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const createCartController = async (req: AuthedRequest, res: Response) => {
    const client = req.client;
    if (!client) {
        return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: 'Client context is missing from request. Is auth middleware applied?' });
    }
    const { items, campaign } = req.body || {};
    try {
        const cart = await createCart(
            client.id,
            Array.isArray(items) ? items : [],
            campaign != null && typeof campaign === 'object' ? campaign : undefined,
        );
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const addToCartController = async (req: AuthedRequest, res: Response) => {
    const client = req.client;
    if (!client) {
        return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: 'Client context is missing from request. Is auth middleware applied?' });
    }
    const { influencerId, quantity } = req.body || {};
    try {
        const qty = quantity != null ? Number(quantity) : 1;
        const cart = await addToCart(client.id, String(influencerId || ''), qty);
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Add to cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const removeFromCartController = async (req: AuthedRequest, res: Response) => {
    const client = req.client;
    if (!client) {
        return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: 'Client context is missing from request. Is auth middleware applied?' });
    }
    const { influencerId } = req.body || {};
    try {
        const cart = await removeFromCart(client.id, String(influencerId || ''));
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Remove from cart error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const updateCartItemController = async (req: AuthedRequest, res: Response) => {
    const client = req.client;
    if (!client) {
        return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: 'Client context is missing from request. Is auth middleware applied?' });
    }
    const { influencerId, quantity } = req.body || {};
    try {
        const qty = Number(quantity);
        const cart = await updateCartItem(client.id, String(influencerId || ''), qty);
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update cart item error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
