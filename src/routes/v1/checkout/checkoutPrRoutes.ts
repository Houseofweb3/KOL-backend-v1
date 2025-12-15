import { Router } from 'express';
import {
    createCheckoutPrHandler, getCheckoutPrsHandler
} from '../../../controllers/v1/checkout/checkoutPrController';

const router = Router();

// Create a new CheckoutPr
router.post('/', createCheckoutPrHandler);

// Get all checkoutPrs
router.get('/', getCheckoutPrsHandler);

export { router as checkoutPrRoutes };

