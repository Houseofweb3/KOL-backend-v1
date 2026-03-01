import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    createCart,
    getCartForClient,
    removeFromCart,
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
    const { items } = req.body || {};
    try {
        const cart = await createCart(client.id, Array.isArray(items) ? items : []);
        return res.status(HttpStatus.OK).json(cart);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create cart error (${status}): ${error.message}`);
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

