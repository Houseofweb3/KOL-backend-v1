import { Request, Response } from 'express';
import { createPackageItem, updatePackageItem, deletePackageItem, getPackageItems } from '../../services/v1/packageItemService';
import logger from '../../config/logger';

// Create a new PackageItem
export const createPackageItemHandler = async (req: Request, res: Response) => {
    const { media, format, monthlyTraffic, turnAroundTime, packageId } = req.body;

    if (!media || !format || !monthlyTraffic || !turnAroundTime || !packageId) {
        logger.warn('Missing required fields for creating package item');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newPackageItem = await createPackageItem(media, format, monthlyTraffic, turnAroundTime, packageId);
        return res.status(201).json(newPackageItem);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating package item: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Update a PackageItem
export const updatePackageItemHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { media, format, monthlyTraffic, turnAroundTime } = req.body;

    if (!id) {
        logger.warn('Missing ID for updating package item');
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        const updatedPackageItem = await updatePackageItem(id, media, format, monthlyTraffic, turnAroundTime);
        return res.status(200).json(updatedPackageItem);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error updating package item with id ${id}: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

// Delete a PackageItem
export const deletePackageItemHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        logger.warn('Missing ID for deleting package item');
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        await deletePackageItem(id);
        return res.status(204).send();
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting package item with id ${id}: ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};

// Get all PackageItems or get a PackageItem by ID
export const getPackageItemsHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await getPackageItems(id);
        if (id) {
            return res.status(200).json(result);
        } else {
            return res.status(200).json(result);
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching package item(s): ${error}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during option creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};
