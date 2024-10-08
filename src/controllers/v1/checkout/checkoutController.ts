import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { fetchInvoiceDetails } from '../../../services/v1/payment';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import { createCheckout, getCheckoutById, deleteCheckout } from '../../../services/v1/checkout';

// Create a new Checkout
export const createCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const {
        cartId,
        totalAmount,
        firstName,
        lastName,
        projectName,
        telegramId,
        projectUrl,
        email,
        managementFee,
        managementFeePercentage,
        discount,
    } = req.body;

    if (!cartId || !totalAmount || !firstName || !lastName || !projectName || !email) {
        logger.warn('Missing required fields: cartId and/or totalAmount');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const newCheckout = await createCheckout(cartId, totalAmount, {
            firstName,
            lastName,
            projectName,
            telegramId,
            projectUrl,
            email,
        });
        res.status(HttpStatus.CREATED).json(newCheckout);

        // Process invoice generation in the background
        fetchInvoiceDetails(
            cartId as string,
            email as string,
            managementFee as number,
            managementFeePercentage as number,
            totalAmount as number,
            discount as number,
        )
            .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
            .catch((error) =>
                logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`),
            );
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating checkout: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating checkout');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

// Get Checkout by ID
export const getCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for fetching checkout');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        const checkout = await getCheckoutById(id);
        if (!checkout) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: 'Checkout not found' });
        }
        return res.status(HttpStatus.OK).json(checkout);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching checkout with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching checkout');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

export const deleteCheckoutHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting checkout');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        await deleteCheckout(id);
        return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting checkout with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while deleting checkout');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};
