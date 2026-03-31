import express from 'express';
import { verifyAdminAuth } from '../../../middleware/auth';
import { getExchangeRateController } from '../../../controllers/v1/admin/rate.controller';

const router = express.Router();

router.use(verifyAdminAuth);

/**
 * GET /admin/rate?from=INR&to=USD
 */
router.get('/', getExchangeRateController);

export { router as adminRateRoutes };

