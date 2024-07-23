import { Router } from 'express';
import {
    createCartHandler,
    deleteCartHandler,
    getCartsHandler
} from '../../controllers/v1/cart/cartController';

const router = Router();

// Create a new Cart
router.post('/', createCartHandler);

// Delete a Cart
router.get('/getCart', getCartsHandler);

// Delete a Cart
router.delete('/:id', deleteCartHandler);

// // Get a Cart by ID or get all Carts
// router.get('/', getCartsHandler);

export default router;
