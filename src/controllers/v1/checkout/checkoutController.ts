import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { fetchInvoiceDetails } from '../../../services/v1/payment';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import { createCheckout, getCheckoutById, deleteCheckout, getCheckouts } from '../../../services/v1/checkout';

import { isValidEmail, isValidTelegramId, isValidUrl } from '../utils/validChecks';

// Checkout Handler with Proper Validation
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
        campaignLiveDate,
    } = req.body;

    // Required fields validation
    const requiredFields = { cartId, totalAmount, firstName, lastName, projectName, email };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || (typeof value === "string" && !value.trim()))
        .map(([key]) => key);

    if (missingFields.length > 0) {
        logger.warn(`Missing required fields: ${missingFields.join(", ")}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
            error: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    // Input-specific validations
    if (!isValidEmail(email)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid email format" });
    }

    if (!isValidTelegramId(telegramId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid Telegram ID" });
    }

    if (!isValidUrl(projectUrl)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid Project URL" });
    }

    if (typeof totalAmount !== "number" || totalAmount <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Total amount must be a positive number" });
    }

    if (managementFee !== undefined && (typeof managementFee !== "number" || managementFee < 0)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Management fee must be a non-negative number" });
    }

    if (managementFeePercentage !== undefined && (typeof managementFeePercentage !== "number" || managementFeePercentage < 0 || managementFeePercentage > 100)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Management fee percentage must be between 0 and 100" });
    }

    if (discount !== undefined && (typeof discount !== "number" || discount < 0)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Discount must be a non-negative number" });
    }

    try {
        const checkoutDetails = { firstName, lastName, projectName, telegramId, projectUrl, email, campaignLiveDate, managementFeePercentage, discount };

        const newCheckout = await createCheckout(cartId, totalAmount, checkoutDetails);
        res.status(HttpStatus.CREATED).json(newCheckout);

        // Process invoice in the background
        fetchInvoiceDetails(cartId, email, managementFeePercentage, totalAmount, discount, checkoutDetails)
            .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
            .catch(error => logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`));

    } catch (error) {
        logger.error(`Error creating checkout: ${error instanceof Error ? error.message : "Unknown error"}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: error instanceof Error ? error.message : "An unknown error occurred",
        });
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


// Get all Checkouts with pagination and its billing details
export const getCheckoutsHandler = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const sortField = req.query.sortField as string || 'createdAt';
    const sortOrder = req.query.sortOrder as 'ASC' | 'DESC' || 'DESC';
    const searchTerm = req.query.searchTerm as string;

    try {
        const { billingDetails, pagination } = await getCheckouts(page, limit, sortField, sortOrder, searchTerm);
        return res.status(HttpStatus.OK).json({
            billingDetails,
            pagination
        });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching all checkouts: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching checkouts');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};
