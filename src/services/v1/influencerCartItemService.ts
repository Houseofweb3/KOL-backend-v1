import { AppDataSource } from '../../config/data-source';
import { InfluencerCartItem } from '../../entity/cart/influencerCartItem.entity';
import logger from '../../config/logger';

const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
// Create InfluencerCartItem
export const createInfluencerCartItem = async (influencerId: string, cartId: string): Promise<InfluencerCartItem> => {
    try {
        const influencerCartItem = new InfluencerCartItem();
        influencerCartItem.influencer = { id: influencerId } as any;
        influencerCartItem.cart = { id: cartId } as any;

        const newItem = await influencerCartItemRepository.save(influencerCartItem);
        logger.info(`Created new InfluencerCartItem with id ${newItem.id}`);
        return newItem;
    } catch (error) {
        logger.error(`Error creating InfluencerCartItem: ${error}`);
        throw new Error('Error creating InfluencerCartItem');
    }
};

// Delete InfluencerCartItem
export const deleteInfluencerCartItem = async (id: string): Promise<void> => {
    try {
        await influencerCartItemRepository.delete(id);
        logger.info(`Deleted InfluencerCartItem with id ${id}`);
    } catch (error) {
        logger.error(`Error deleting InfluencerCartItem: ${error}`);
        throw new Error('Error deleting InfluencerCartItem');
    }
};

// Fetch InfluencerCartItems
export const getInfluencerCartItems = async (cartId?: string): Promise<InfluencerCartItem[]> => {
    try {
        const queryBuilder = influencerCartItemRepository.createQueryBuilder('influencerCartItem')
            .leftJoinAndSelect('influencerCartItem.influencer', 'influencer')
            .leftJoinAndSelect('influencerCartItem.cart', 'cart');

        if (cartId) {
            queryBuilder.where('cart.id = :cartId', { cartId });
        }

        const items = await queryBuilder.getMany();
        logger.info(`Fetched ${items.length} InfluencerCartItem(s)`);
        return items;
    } catch (error) {
        logger.error(`Error fetching InfluencerCartItem(s): ${error}`);
        throw new Error('Error fetching InfluencerCartItem(s)');
    }
};

