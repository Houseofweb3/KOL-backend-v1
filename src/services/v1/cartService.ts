import { AppDataSource } from '../../config/data-source';
import { Cart } from '../../entity/cart';
import logger from '../../config/logger';

const cartRepository = AppDataSource.getRepository(Cart);
// Create a new Cart
export const createCart = async (userId?: string): Promise<Cart> => {
  try {
    const newCart = cartRepository.create({ user: userId ? { id: userId } : undefined });

    await cartRepository.save(newCart);
    logger.info(`Created new cart with id ${newCart.id}`);
    return newCart;
  } catch (error) {
    logger.error(`Error creating cart: ${error}`);
    throw new Error('Error creating cart');
  }
};


// Delete a Cart
export const deleteCart = async (id: string): Promise<void> => {
  try {
    await cartRepository.delete({ id });
    logger.info(`Deleted cart with id ${id}`);
  } catch (error) {
    logger.error(`Error deleting cart with id ${id}: ${error}`);
    throw new Error('Error deleting cart');
  }
};


export const getCarts = async (userId?: string, id?: string): Promise<Cart[]> => {
  try {
    let queryBuilder = cartRepository.createQueryBuilder('cart')
      .leftJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.influencerCartItems', 'influencerCartItems')
      .leftJoinAndSelect('influencerCartItems.influencer', 'influencer')  // Join related Influencer
      .leftJoinAndSelect('cart.packageCartItems', 'packageCartItems')  // Ensure correct join
      .leftJoinAndSelect('packageCartItems.packageItem', 'packageItem')  // Join related PackageItem
      .leftJoinAndSelect('cart.checkout', 'checkout').where('cart.id = :id', { id })

    if (id) {
      queryBuilder = queryBuilder.where('cart.id = :id', { id });
    } else if (userId) {
      queryBuilder = queryBuilder.where('cart.userId = :userId', { userId });
    }

    const carts = await queryBuilder.getMany();
    logger.info(`Fetched ${carts.length} cart(s)`);
    return carts;
  } catch (error) {
    logger.error(`Error fetching cart(s): ${error}`);
    throw new Error('Error fetching cart(s)');
  }
};


