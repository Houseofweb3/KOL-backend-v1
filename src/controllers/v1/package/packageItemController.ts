import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import {
    createPackageItem,
    updatePackageItem,
    deletePackageItem,
    getPackageItems
} from '../../../services/v1/package';

// Create a new PackageItem
export const createPackageItemHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { media, format, monthlyTraffic, turnAroundTime, packageId } = req.body;

    if (!media || !format || !monthlyTraffic || !turnAroundTime || !packageId) {
        logger.warn('Missing required fields for creating package item');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const newPackageItem = await createPackageItem(media, format, monthlyTraffic, turnAroundTime, packageId);
        return res.status(HttpStatus.CREATED).json(newPackageItem);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating package item: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

// Update a PackageItem
export const updatePackageItemHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { media, format, monthlyTraffic, turnAroundTime } = req.body;

    if (!id) {
        logger.warn('Missing ID for updating package item');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        const updatedPackageItem = await updatePackageItem(id, media, format, monthlyTraffic, turnAroundTime);
        return res.status(HttpStatus.OK).json(updatedPackageItem);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error updating package item with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

// Delete a PackageItem
export const deletePackageItemHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting package item');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing ID' });
    }

    try {
        await deletePackageItem(id);
        return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting package item with id ${id}: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }

    }
};

// Get all PackageItems or get a PackageItem by ID
export const getPackageItemsHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await getPackageItems(id);
        if (id) {
            return res.status(HttpStatus.OK).json(result);
        } else {
            return res.status(HttpStatus.OK).json(result);
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching package item(s): ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }

    }
};
