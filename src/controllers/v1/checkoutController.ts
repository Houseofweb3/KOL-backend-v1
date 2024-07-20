import { Request, Response } from 'express';
import { createCheckout, getCheckoutById, deleteCheckout } from '../../services/v1/checkoutService';
import logger from '../../config/logger';
import { setCorsHeaders } from '../../middleware/setcorsHeaders';
// Create a new Checkout
export const createCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { cartId, totalAmount } = req.body;

    if (!cartId || !totalAmount) {
        logger.warn('Missing required fields: cartId and/or totalAmount');
        return res.status(400).json({ error: 'Missing required fields: cartId and/or totalAmount' });
    }

    try {
        const newCheckout = await createCheckout(cartId, totalAmount);
        return res.status(201).json(newCheckout);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating checkout: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating checkout');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Get Checkout by ID
export const getCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for fetching checkout');
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        const checkout = await getCheckoutById(id);
        if (!checkout) {
            return res.status(404).json({ error: 'Checkout not found' });
        }
        return res.status(200).json(checkout);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching checkout with id ${id}: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching checkout');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Delete a Checkout
export const deleteCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting checkout');
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        await deleteCheckout(id);
        return res.status(204).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting checkout with id ${id}: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while deleting checkout');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
