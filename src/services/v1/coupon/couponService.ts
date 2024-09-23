import { getRepository } from 'typeorm';
import { CouponCode } from '../../../entity/couponCode/CouponCode.entity'; // Adjust import based on your actual entity path
import { AppDataSource } from '../../../config/data-source';
// Function to get active coupons
export const getActiveCoupons = async (): Promise<CouponCode[]> => {
    try {
        const currentTimeStamp = Math.floor(Date.now() / 1000);

        const activeCoupons = await AppDataSource.getRepository(CouponCode)
            .createQueryBuilder('coupon')
            .where('coupon.expiryTimeStamp > :currentTimeStamp', { currentTimeStamp })
            .orderBy('coupon.createdAt', 'DESC')
            .getMany();

        return activeCoupons;
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        throw new Error('Error fetching active coupons');
    }
};
