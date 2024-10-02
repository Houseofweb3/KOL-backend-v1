import { Request, Response, NextFunction } from 'express';
import { getRepository } from 'typeorm';
import { CouponCode } from '../../../entity/couponCode/CouponCode.entity';
import { UserCoupon } from '../../../entity/couponCode/userCoupon.entity';
import { AppDataSource } from '../../../config/data-source';

// Middleware to check if a coupon code is valid and availed by the user
export const checkCouponCodeService = async (
    userId: string,
    couponId: string,
    orderTotal: number,
): Promise<string | CouponCode> => {
    try {
        // Ensure both userId and couponCode are provided
        if (!userId || !couponId) {
            return 'User ID and Coupon Code are required';
        }
        // Fetch the coupon details
        const couponRepository = AppDataSource.getRepository(CouponCode);
        const coupon = await couponRepository.findOne({
            where: { id: couponId, active: true },
        });

        // Check if the coupon exists and is active
        if (!coupon) {
            return 'Coupon code is invalid or not active';
        }

        // Check if the coupon has expired
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (currentTimestamp > coupon.expiryTimeStamp) {
            return 'Coupon code has expired';
        }

        // Fetch user's coupon usage to check if the coupon was already used
        const userCouponRepository = AppDataSource.getRepository(UserCoupon);
        let userCoupon = await userCouponRepository.findOne({
            where: {
                user: { id: userId } as any, // Ensure userId is cast to string
                couponCode: { id: coupon.id },
            },
        });

        // Check if the coupon has already been used by this user
        if (userCoupon?.isUsed && userCoupon.hasAvail) {
            return 'You have already used this coupon code';
        }

        // Check if the minimum order value is satisfied if required
        if (coupon.minimumOrderValue && orderTotal < coupon.minimumOrderValue) {
            return `Order total must be at least ${coupon.minimumOrderValue} to use this coupon.`;
        }

        // If the coupon exists but hasn't been marked as used, update the `isUsed` status
        if (!userCoupon) {
            // If there's no existing record, create one
            userCoupon = userCouponRepository.create({
                user: { id: userId } as any,
                couponCode: { id: coupon.id } as any,
                hasAvail: true,
            });
        } else {
            // If there's an existing record, update it to mark the coupon as used
            userCoupon.hasAvail = true;
        }

        // Save the changes to the database
        await userCouponRepository.save(userCoupon);

        return coupon;
    } catch (error) {
        console.error('Error checking coupon code usage:', error);

        throw new Error('Some error occured');
    }
};
