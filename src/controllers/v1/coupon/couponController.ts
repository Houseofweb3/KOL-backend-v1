// src/controllers/couponController.ts
import { Request, Response } from 'express';
import { getActiveCoupons } from '../../../services/v1/coupon/couponService'; // Adjust the path as necessary

// Controller function to handle getting active coupons
export const getActiveCouponsController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Call the service to get active coupons
        const activeCoupons = await getActiveCoupons();

        // Respond with the active coupons
        res.status(200).json({
            message: 'Active coupons fetched successfully',
            data: activeCoupons,
        });
    } catch (error) {
        console.error('Error in getActiveCouponsController:', error);
        res.status(500).json({
            message: 'Failed to fetch active coupons',
        });
    }
};
