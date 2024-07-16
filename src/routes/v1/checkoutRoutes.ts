import { Router } from 'express';
import {
    createCheckoutHandler,
} from '../../controllers/v1/checkoutController';

const router = Router();

// Create a new Cart
router.post('/', createCheckoutHandler);

export default router;
