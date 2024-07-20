import { Request, Response } from 'express';
import { createInfluencerCartItem, deleteInfluencerCartItem, getInfluencerCartItems } from '../../services/v1/influencerCartItemService';
import logger from '../../config/logger';
import { setCorsHeaders } from '../../middleware/setcorsHeaders';
// Create InfluencerCartItem
export const createInfluencerCartItemHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    const { influencerId, cartId } = req.body;

    try {
        const newItem = await createInfluencerCartItem(influencerId, cartId);
        logger.info(`Created InfluencerCartItem with id ${newItem.id}`);
        return res.status(201).json(newItem);
    } catch (error: any) {
        logger.error(`Error creating InfluencerCartItem: ${error.message}`);
        return res.status(500).json({ message: 'Error creating InfluencerCartItem', error: error.message });
    }
};

// Delete InfluencerCartItem
export const deleteInfluencerCartItemHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    try {
        await deleteInfluencerCartItem(id);
        logger.info(`Deleted InfluencerCartItem with id ${id}`);
        return res.status(200).json({ message: 'InfluencerCartItem deleted successfully' });
    } catch (error: any) {
        logger.error(`Error deleting InfluencerCartItem: ${error.message}`);
        return res.status(500).json({ message: 'Error deleting InfluencerCartItem', error: error.message });
    }
};

// Fetch InfluencerCartItems
export const getInfluencerCartItemsHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { cartId } = req.query;

    try {
        const items = await getInfluencerCartItems(cartId as string);
        logger.info(`Fetched ${items.length} InfluencerCartItem(s)`);
        return res.status(200).json(items);
    } catch (error: any) {
        logger.error(`Error fetching InfluencerCartItem(s): ${error.message}`);
        return res.status(500).json({ message: 'Error fetching InfluencerCartItem(s)', error: error.message });
    }
};
