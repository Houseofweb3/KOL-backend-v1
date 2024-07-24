import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { createCart, deleteCart, getCarts } from '../../../services/v1/cart';


// Create a new Cart
export const createCartHandler = async (req: Request, res: Response) => {
    const { userId } = req.body;

    try {
        const cart = await createCart(userId);
        return res.status(HttpStatus.CREATED).json(cart);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating or getting cart: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating or getting cart');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};


// Delete a Cart
export const deleteCartHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting cart');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        await deleteCart(id);
        return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting cart with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating influencer');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};


export const getCartsHandler = async (req: Request, res: Response) => {
  const { userId } = req.query;

  try {
    const carts = await getCarts(userId as string);

    logger.info(`Fetched ${carts.length} cart(s) for user ${userId || 'N/A'}`);
    return res.status(HttpStatus.OK).json(carts);
  } catch (error: any) {
    
    logger.error(`Error fetching cart(s): ${error.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching cart(s)', error: error.message });
  }
};

