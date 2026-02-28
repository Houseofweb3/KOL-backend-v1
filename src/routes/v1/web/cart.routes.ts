import express from 'express';
import { verifyClientAuth } from '../../../middleware/auth';
import {
    getCartController,
    addToCartController,
    createCartController,
    removeFromCartController,
    updateCartItemController,
} from '../../../controllers/v1/web/cart.controller';

const router = express.Router();

// All cart routes are protected: require client JWT
router.use(verifyClientAuth);

router.get('/', getCartController);
router.post('/create', createCartController);
router.post('/add', addToCartController);
router.post('/remove', removeFromCartController);
router.post('/update', updateCartItemController);

export { router as webCartRoutes };

