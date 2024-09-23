import { Router } from 'express';
import { getActiveCouponsController } from '../../../controllers/v1/coupon/couponController';
const router = Router();

router.get('/', getActiveCouponsController);
export { router as couponRoutes };
