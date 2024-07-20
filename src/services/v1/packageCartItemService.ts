import { AppDataSource } from '../../config/data-source';
import { PackageCartItem } from '../../entity/cart/PackageCartItem.entity';
import logger from '../../config/logger';
import { Package } from '../../entity/package/Package.entity';

const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);
const packageRepository = AppDataSource.getRepository(Package);

// Create PackageCartItem
export const createPackageCartItem = async (packageId: string, cartId: string): Promise<PackageCartItem> => {
    try {
        // Check if the package exists
        const packageEntity = await packageRepository.findOneBy({ id: packageId });
        if (!packageEntity) {
            throw new Error(`Package with id ${packageId} not found`);
        }

        const packageCartItem = new PackageCartItem();
        packageCartItem.package = packageEntity;
        packageCartItem.cart = { id: cartId } as any;

        const newItem = await packageCartItemRepository.save(packageCartItem);
        logger.info(`Created new PackageCartItem with id ${newItem.id}`);
        return newItem;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating PackageCartItem: ${error.message}`);
            throw new Error('Error creating PackageCartItem');
        } else {
            logger.error('Unknown error occurred while creating PackageCartItem');
            throw new Error('Unknown error occurred while creating PackageCartItem');
        }
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
            .leftJoinAndSelect('packageCartItem.package', 'package')
            .leftJoinAndSelect('package.packageItems', 'packageItem')
            .leftJoinAndSelect('packageCartItem.cart', 'cart');

        if (cartId) {
            queryBuilder.where('cart.id = :cartId', { cartId });
        }

        const items = await queryBuilder.getMany();
        logger.info(`Fetched ${items.length} PackageCartItem(s)`);
        return items;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching PackageCartItem(s): ${error.message}`);
            throw new Error('Error fetching PackageCartItem(s)');
        } else {
            logger.error('Unknown error occurred while fetching PackageCartItem(s)');
            throw new Error('Unknown error occurred while fetching PackageCartItem(s)');
        }
    }
};