import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { updateTimestamp } from '../../../utils/updateTimestamp';
import { getRepository } from 'typeorm';
import { checkCouponCodeService } from './cuponCodeCheckerService';

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
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    applyCoupon: boolean = false,
    couponId?: string,
): Promise<any[]> => {
    try {
        const validSortFields = ['createdAt', 'updatedAt']; // Adjust valid sort fields as needed
        const order: { [key: string]: 'ASC' | 'DESC' } = validSortFields.includes(sortField)
            ? { [sortField]: sortOrder }
            : { createdAt: sortOrder };

        let queryBuilder = AppDataSource.getRepository(Cart)
            .createQueryBuilder('cart')
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

        // Calculate the order total
        const calculateTotalPrice = (cart: Cart) => {
            let totalPrice = 0;
            if (cart.packageCartItems && cart.packageCartItems.length > 0) {
                totalPrice += cart.packageCartItems.reduce((sum, item) => {
                    return sum + (item.package ? item.package.cost : 0);
                }, 0);
            }

            if (cart.influencerCartItems && cart.influencerCartItems.length > 0) {
                totalPrice += cart.influencerCartItems.reduce((sum, item) => {
                    return sum + (item.influencer ? Number(item.influencer.price) || 0 : 0);
                }, 0);
            }
            return totalPrice;
        };

        // Handle coupon application if requested
        let discountMessage = '';
        let discountValue = 0;
        if (applyCoupon && couponId && userId) {
            const orderTotal = calculateTotalPrice(carts[0]);
            let couponResponse = await checkCouponCodeService(userId, couponId, orderTotal);

            if (typeof couponResponse === 'string') {
                discountMessage = couponResponse; // Set the message if the response is an error or notice
            } else {
                discountMessage = 'Coupon applied successfully';
                discountValue = couponResponse.discountPercentage || 0; // Assuming the coupon has a discountValue field
            }
        }

        // Transform the response
        const transformedCarts = carts.map((cart) => {
            let totalPrice = calculateTotalPrice(cart);

            // Determine the management fee percentage based on the total price
            let managementFeePercentage = 0;
            if (totalPrice < 25000) {
                managementFeePercentage = 15;
            } else if (totalPrice < 50000) {
                managementFeePercentage = 12.5;
            } else if (totalPrice < 75000) {
                managementFeePercentage = 10; // Negotiable if not an affiliate deal
            } else if (totalPrice < 100000) {
                managementFeePercentage = 7.5; // Direct deal
            }

            // Calculate the initial management fee
            const managementFee = (totalPrice * managementFeePercentage) / 100;

            // Apply the 5% discount on the management fee
            const discountPercentage = 5;
            const discountedManagementFee =
                managementFee - (managementFee * discountPercentage) / 100;

            const totalPriceAfterCouponDiscount = totalPrice - (totalPrice * discountValue) / 100;

            const totalPriceAfterDiscount = totalPriceAfterCouponDiscount + discountedManagementFee;

            // Include the total price, management fee, discounted fee, and percentage in the transformed cart
            return {
                ...cart,
                subtotal: totalPrice,
                managementFee,
                discount: discountedManagementFee,
                total: totalPriceAfterDiscount,
                cutAmount: totalPrice + managementFee,
                discountPercentage,
                managementFeePercentage,
                influencerCartItems: cart.influencerCartItems.map((item) => {
                    if (item.influencer) {
                        (item.influencer as any).influencer = item.influencer.name;
                        delete (item.influencer as any).name;

                        (item.influencer as any).followers = item.influencer.subscribers;
                        delete (item.influencer as any).subscribers;
                    }
                    return item;
                }),
                discountMessage, // Include the message from the coupon check
            };
        });

        logger.info(`Fetched ${transformedCarts.length} cart(s) for page ${page}, limit ${limit}`);

        return transformedCarts;
    } catch (error) {
        logger.error(`Error fetching cart(s): ${error}`);
        throw new Error('Error fetching cart(s)');
    }
};
