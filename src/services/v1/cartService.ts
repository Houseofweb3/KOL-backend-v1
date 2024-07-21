import { AppDataSource } from '../../config/data-source';
import { Cart } from '../../entity/cart';
import logger from '../../config/logger';
import { updateTimestamp } from '../../utils/updateTimestamp';

const cartRepository = AppDataSource.getRepository(Cart);

// Create or get an existing Cart
export const createCart = async (userId?: string): Promise<Cart> => {
  try {
    let cart: Cart | null = null;

    // if (userId) {
    //   // cart = await cartRepository.findOneBy({ user: { id: userId } });

    //   // if (cart) {
    //     cart = await updateTimestamp(cartRepository, cart);
    //     logger.info(`Updated existing cart for user with id ${userId}`);
    //     return cart;
    //   // }
    // }

    const newCart = cartRepository.create({ user: userId ? { id: userId } : undefined });
    const savedCart = await updateTimestamp(cartRepository, newCart);
    logger.info(`Created new cart with id ${savedCart.id}`);
    return savedCart;
  } catch (error) {
    logger.error(`Error creating or getting cart: ${error}`);
    throw new Error('Error creating or getting cart');
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
      .leftJoinAndSelect('influencerCartItems.influencer', 'influencer')
      .leftJoinAndSelect('cart.packageCartItems', 'packageCartItems')
      .leftJoinAndSelect('packageCartItems.package', 'package')  // Correct relation name
      .leftJoinAndSelect('package.packageItems', 'packageItems')  // Correct join for packageItems
      .leftJoinAndSelect('cart.checkout', 'checkout');

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