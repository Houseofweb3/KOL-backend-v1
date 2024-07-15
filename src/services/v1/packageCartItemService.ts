import { AppDataSource } from '../../config/data-source';
import { PackageCartItem } from '../../entity/cart';
import logger from '../../config/logger';

const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem)

// Create PackageCartItem
export const createPackageCartItem = async (packageItemId: string, cartId: string): Promise<PackageCartItem> => {
    try {
        const packageCartItem = new PackageCartItem();
        packageCartItem.packageItem = { id: packageItemId } as any; 
        packageCartItem.cart = { id: cartId } as any;

        const newItem = await packageCartItemRepository.save(packageCartItem);
        logger.info(`Created new PackageCartItem with id ${newItem.id}`);
        return newItem;
    } catch (error) {
        logger.error(`Error creating PackageCartItem: ${error}`);
        throw new Error('Error creating PackageCartItem');
    }
};

// Delete PackageCartItem
export const deletePackageCartItem = async (id: string): Promise<void> => {
    try {
        await packageCartItemRepository.delete(id);
        logger.info(`Deleted PackageCartItem with id ${id}`);
    } catch (error) {
        logger.error(`Error deleting PackageCartItem: ${error}`);
        throw new Error('Error deleting PackageCartItem');
    }
};

// Fetch PackageCartItems
export const getPackageCartItems = async (cartId?: string): Promise<PackageCartItem[]> => {
    try {
        const queryBuilder = packageCartItemRepository.createQueryBuilder('packageCartItem')
            .leftJoinAndSelect('packageCartItem.packageItem', 'packageItem')
            .leftJoinAndSelect('packageCartItem.cart', 'cart');

        if (cartId) {
            queryBuilder.where('cart.id = :cartId', { cartId });  
        }

        const items = await queryBuilder.getMany();
        logger.info(`Fetched ${items.length} PackageCartItem(s)`);
        return items;
    } catch (error) {
        logger.error(`Error fetching PackageCartItem(s): ${error}`);
        throw new Error('Error fetching PackageCartItem(s)');
    }
};

