import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { updateTimestamp } from '../../../utils/updateTimestamp';
import { UserCoupon } from '../../../entity/couponCode';
import { checkCouponCodeService } from './cuponCodeCheckerService';

const cartRepository = AppDataSource.getRepository(Cart);

// Create or get an existing Cart
export const createCart = async (userId?: string): Promise<Cart> => {
    try {
        const cart: Cart | null = null;

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
        const validSortFields = ['createdAt', 'updatedAt'];
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
            .leftJoinAndSelect('cart.checkout', 'checkout')
            .leftJoinAndSelect('user.userCoupons', 'userCoupons')
            .leftJoinAndSelect('userCoupons.couponCode', 'couponCode');

        queryBuilder = queryBuilder.where('cart.userId = :userId', { userId });

        queryBuilder = queryBuilder
            .orderBy(`cart.${sortField}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [carts, total] = await queryBuilder.getManyAndCount();

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

        const transformedCarts = await Promise.all(
            carts.map(async (cart) => {
                const totalPrice = calculateTotalPrice(cart);

                let managementFeePercentage = 0;

                if (totalPrice < 30000) {
                    managementFeePercentage = 20;
                } else if (totalPrice < 100000) {
                    managementFeePercentage = 15;
                } else {
                    managementFeePercentage = 12.5;
                }

                const managementFee = (totalPrice * managementFeePercentage) / 100;
                const discountPercentage = 5;
                const discountedManagementFee = managementFee - (managementFee * discountPercentage) / 100;

                let discountMessage = '';
                let discountValue = 0;
                let appliedCoupon = null;

                // Check for the coupon to be applied
                if (applyCoupon && couponId && userId) {
                    const couponResponse = await checkCouponCodeService(
                        userId,
                        couponId,
                        totalPrice,
                    );

                    if (typeof couponResponse !== 'string') {
                        appliedCoupon = couponResponse;
                        discountMessage = 'Coupon applied successfully';
                        discountValue = couponResponse.discountPercentage || 0;
                    } else {
                        discountMessage = couponResponse;
                    }
                } else {
                    // Check for previously availed but unused coupon
                    const availedCoupon = cart.user?.userCoupons?.find(
                        (uc) => uc.hasAvail && !uc.isUsed,
                    );
                    if (availedCoupon) {
                        const couponResponse = await checkCouponCodeService(
                            userId!,
                            availedCoupon.couponCode.id,
                            totalPrice,
                        );

                        if (typeof couponResponse !== 'string') {
                            appliedCoupon = couponResponse;
                            discountMessage = 'Previously availed coupon applied';
                            discountValue = couponResponse.discountPercentage || 0;
                        } else {
                            discountMessage = couponResponse;
                        }
                    }
                }
                const managementFeeAfterCouponDiscount =
                    managementFee - (managementFee * discountValue) / 100;
                const totalPriceAfterDiscount = totalPrice + managementFeeAfterCouponDiscount;

                // Mark coupon as used if checkout is not null and a coupon was applied
                if (cart.checkout && appliedCoupon) {
                    const userCouponRepository = AppDataSource.getRepository(UserCoupon);
                    const userCoupon = await userCouponRepository.findOne({
                        where: {
                            user: { id: userId } as any,
                            couponCode: { id: appliedCoupon.id } as any,
                        },
                    });
                    if (userCoupon) {
                        userCoupon.isUsed = true;
                        await userCouponRepository.save(userCoupon);
                    }
                }

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
                    discountMessage,
                    couponDiscount: discountValue,
                    appliedCouponId: appliedCoupon ? appliedCoupon.id : null,
                };
            }),
        );

        logger.info(`Fetched ${transformedCarts.length} cart(s) for page ${page}, limit ${limit}`);

        return transformedCarts;
    } catch (error) {
        logger.error(`Error fetching cart(s): ${error}`);
        throw new Error('Error fetching cart(s)');
    }
};
