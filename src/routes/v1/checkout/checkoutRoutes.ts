import { Router } from 'express';
import {
    createCheckoutHandler,
} from '../../../controllers/v1/checkout';

const router = Router();

// Create a new Cart
router.post('/', createCheckoutHandler);

export { router as checkoutRoutes };
