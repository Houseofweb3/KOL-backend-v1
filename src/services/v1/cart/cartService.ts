import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { updateTimestamp } from '../../../utils/updateTimestamp';

const cartRepository = AppDataSource.getRepository(Cart);

// Create or get an existing Cart
export const createCart = async (userId?: string): Promise<Cart> => {
  try {
    let cart: Cart | null = null;
    // TODO: Remove the access code if required
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

export const deleteCart = async (id: string): Promise<void> => {
  try {
    await cartRepository.delete({ id });
    logger.info(`Deleted cart with id ${id}`);
  } catch (error) {
    logger.error(`Error deleting cart with id ${id}: ${error}`);
    throw new Error('Error deleting cart');
  }
};

export const getCarts = async (
  userId?: string,
  page: number = 1,
  limit: number = 10,
  sortField: string = 'createdAt',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<any[]> => {
  try {
    const validSortFields = ['createdAt', 'updatedAt']; // Adjust valid sort fields as needed
    const order: { [key: string]: 'ASC' | 'DESC' } = validSortFields.includes(sortField)
      ? { [sortField]: sortOrder }
      : { createdAt: sortOrder };

    let queryBuilder = cartRepository.createQueryBuilder('cart')
      .leftJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.influencerCartItems', 'influencerCartItems')
      .leftJoinAndSelect('influencerCartItems.influencer', 'influencer')
      .leftJoinAndSelect('cart.packageCartItems', 'packageCartItems')
      .leftJoinAndSelect('packageCartItems.package', 'package')
      .leftJoinAndSelect('package.packageItems', 'packageItems')
      .leftJoinAndSelect('cart.checkout', 'checkout');

    queryBuilder = queryBuilder.where('cart.userId = :userId', { userId });

    // Apply sorting and pagination
    queryBuilder = queryBuilder
      .orderBy(`cart.${sortField}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [carts, total] = await queryBuilder.getManyAndCount();

    // Transform the response
    const transformedCarts = carts.map(cart => {
      cart.influencerCartItems = cart.influencerCartItems.map(item => {
        if (item.influencer) {
          (item.influencer as any).influencer = item.influencer.name;
          delete (item.influencer as any).name;

          (item.influencer as any).followers = item.influencer.subscribers;
          delete (item.influencer as any).subscribers;
        }
        return item;
      });
      return cart;
    });

    logger.info(`Fetched ${transformedCarts.length} cart(s) for page ${page}, limit ${limit}`);

    return transformedCarts
  } catch (error) {
    logger.error(`Error fetching cart(s): ${error}`);
    throw new Error('Error fetching cart(s)');
  }
};
