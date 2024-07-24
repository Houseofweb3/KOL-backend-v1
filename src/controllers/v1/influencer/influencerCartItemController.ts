import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import {
    createInfluencerCartItem,
    deleteInfluencerCartItem,
    getInfluencerCartItems
} from '../../../services/v1/influencer';

// Create InfluencerCartItem
export const createInfluencerCartItemHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    const { influencerId, cartId } = req.body;

    try {
        const newItem = await createInfluencerCartItem(influencerId, cartId);
        logger.info(`Created InfluencerCartItem with id ${newItem.id}`);
        return res.status(HttpStatus.CREATED).json(newItem);
    } catch (error: any) {
        logger.error(`Error creating InfluencerCartItem: ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error creating InfluencerCartItem', error: error.message });
    }
};

// Delete InfluencerCartItem
export const deleteInfluencerCartItemHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    try {
        await deleteInfluencerCartItem(id);
        logger.info(`Deleted InfluencerCartItem with id ${id}`);
        return res.status(HttpStatus.OK).json({ message: 'InfluencerCartItem deleted successfully' });
    } catch (error: any) {
        logger.error(`Error deleting InfluencerCartItem: ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error deleting InfluencerCartItem', error: error.message });
    }
};

// Fetch InfluencerCartItems
export const getInfluencerCartItemsHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { cartId } = req.query;

    try {
        const items = await getInfluencerCartItems(cartId as string);
        logger.info(`Fetched ${items.length} InfluencerCartItem(s)`);
        return res.status(HttpStatus.OK).json(items);
    } catch (error: any) {
        logger.error(`Error fetching InfluencerCartItem(s): ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching InfluencerCartItem(s)', error: error.message });
    }
};
