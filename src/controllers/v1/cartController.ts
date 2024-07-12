import { Request, Response } from 'express';
import { createCart, deleteCart, getCarts } from '../../services/v1/cartService';
import logger from '../../config/logger';

// Create a new Cart
export const createCartHandler = async (req: Request, res: Response) => {
    const { userId } = req.body;

    try {
        const newCart = await createCart(userId);
        return res.status(201).json(newCart);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating cart: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating influencer');
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
  const { userId, id } = req.query;

  try {
    const carts = await getCarts(userId as string, id as string);
    logger.info(`Fetched ${carts.length} cart(s) for user ${userId || 'N/A'} and cart ID ${id || 'N/A'}`);
    return res.status(200).json(carts);
  } catch (error: any) {
    logger.error(`Error fetching cart(s): ${error.message}`);
    return res.status(500).json({ message: 'Error fetching cart(s)', error: error.message });
  }
};

