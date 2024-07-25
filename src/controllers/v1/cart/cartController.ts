import { Request, Response } from 'express';
import { createCart, deleteCart, getCarts } from '../../../services/v1/cart';
import logger from '../../../config/logger';

// Create a new Cart
export const createCartHandler = async (req: Request, res: Response) => {
    const { userId } = req.body;

    try {
        const cart = await createCart(userId);
        return res.status(201).json(cart);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating or getting cart: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating or getting cart');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};


// Delete a Cart
export const deleteCartHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting cart');
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        await deleteCart(id);
        return res.status(204).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting cart with id ${id}: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating influencer');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};


export const getCartsHandler = async (req: Request, res: Response) => {
    const { userId, page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'DESC' } = req.query;

    try {
        const cartsResponse = await getCarts(
            userId as string,
            parseInt(page as string, 10),
            parseInt(limit as string, 10),
            sortField as string,
            sortOrder as 'ASC' | 'DESC'
        );

        logger.info(`Fetched ${cartsResponse.length} cart(s) for user ${userId || 'N/A'}`);
        return res.status(200).json(cartsResponse);
    } catch (error: any) {
        logger.error(`Error fetching cart(s): ${error.message}`);
        return res.status(500).json({ message: 'Error fetching cart(s)', error: error.message });
    }
};

