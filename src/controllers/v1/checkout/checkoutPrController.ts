import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import { createCheckoutPr, getCheckoutPrById, deleteCheckoutPr, getCheckoutPrs } from '../../../services/v1/checkout/checkoutPrService';

import { isValidEmail, isValidTelegramId, isValidUrl } from '../utils/validChecks';

// CheckoutPr Handler with Proper Validation
export const createCheckoutPrHandler = async (req: Request, res: Response) => {
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

    if (telegramId && !isValidTelegramId(telegramId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid Telegram ID" });
    }

    if (projectUrl && !isValidUrl(projectUrl)) {
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

        const newCheckoutPr = await createCheckoutPr(cartId, totalAmount, checkoutDetails);
        res.status(HttpStatus.CREATED).json(newCheckoutPr);

        // TODO: Implement DR-specific invoice processing if needed
        // Note: fetchInvoiceDetails is designed for influencer items, not DR items

    } catch (error) {
        logger.error(`Error creating checkoutPr: ${error instanceof Error ? error.message : "Unknown error"}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            error: error instanceof Error ? error.message : "An unknown error occurred",
        });
    }
};

// Get CheckoutPr by ID
export const getCheckoutPrHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for fetching checkoutPr');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        const checkoutPr = await getCheckoutPrById(id);
        if (!checkoutPr) {
            return res.status(HttpStatus.NOT_FOUND).json({ error: 'CheckoutPr not found' });
        }
        return res.status(HttpStatus.OK).json(checkoutPr);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching checkoutPr with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching checkoutPr');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

export const deleteCheckoutPrHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting checkoutPr');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        await deleteCheckoutPr(id);
        return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting checkoutPr with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while deleting checkoutPr');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};


// Get all CheckoutPrs with pagination and its billing details
export const getCheckoutPrsHandler = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const sortField = (req.query.sortField as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';
    const searchTerm = req.query.searchTerm as string;
    // Parse filters from the request in the format [{field:value},..]
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : [];

    try {
        const { billingDetailsPr, pagination } = await getCheckoutPrs(
            page,
            limit,
            sortField,
            sortOrder,
            searchTerm,
            filters,
        );
        return res.status(HttpStatus.OK).json({
            billingDetails: billingDetailsPr,
            pagination
        });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching all checkoutPrs: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching checkoutPrs');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

