import { Router } from 'express';
import {
    createCheckoutHandler, getCheckoutsHandler
} from '../../../controllers/v1/checkout';

const router = Router();

// Create a new Cart
router.post('/', createCheckoutHandler);

// Get all checkouts
router.get('/', getCheckoutsHandler);

export { router as checkoutRoutes };
