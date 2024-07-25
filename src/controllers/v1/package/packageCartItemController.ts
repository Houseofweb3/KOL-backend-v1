import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import {
    createPackageCartItem,
    deletePackageCartItem,
    getPackageCartItems
} from '../../../services/v1/package/packageCartItemService';

// Create PackageCartItem
export const createPackageCartItemHandler = async (req: Request, res: Response) => {

    const { packageId, cartId } = req.body;

    try {
        const newItem = await createPackageCartItem(packageId, cartId);
        logger.info(`Created PackageCartItem with id ${newItem.id}`);
        return res.status(HttpStatus.CREATED).json(newItem);
    } catch (error: any) {
        logger.error(`Error creating PackageCartItem: ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error creating PackageCartItem', error: error.message });
    }
};

// Delete PackageCartItem
export const deletePackageCartItemHandler = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await deletePackageCartItem(id);
        logger.info(`Deleted PackageCartItem with id ${id}`);
        return res.status(HttpStatus.OK).json({ message: 'PackageCartItem deleted successfully' });
    } catch (error: any) {
        logger.error(`Error deleting PackageCartItem: ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error deleting PackageCartItem', error: error.message });
    }
};

// Fetch PackageCartItems
export const getPackageCartItemsHandler = async (req: Request, res: Response) => {
    const { cartId } = req.query;

    try {
        const items = await getPackageCartItems(cartId as string);
        logger.info(`Fetched ${items.length} PackageCartItem(s)`);
        return res.status(HttpStatus.OK).json(items);
    } catch (error: any) {
        logger.error(`Error fetching PackageCartItem(s): ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching PackageCartItem(s)', error: error.message });
    }
};
