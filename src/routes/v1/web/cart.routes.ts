import express from 'express';
import { verifyClientAuth } from '../../../middleware/auth';
import {
    getCartController,
    createCartController,
    removeFromCartController,
} from '../../../controllers/v1/web/cart.controller';

const router = express.Router();

// All cart routes are protected: require client JWT
router.use(verifyClientAuth);

router.get('/', getCartController);
router.post('/create', createCartController);
router.post('/remove', removeFromCartController);

export { router as webCartRoutes };

