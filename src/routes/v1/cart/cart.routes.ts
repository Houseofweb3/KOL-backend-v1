import { Router } from 'express';
import {
    createCartHandler,
    deleteCartHandler,
    getCartsHandler
} from '../../../controllers/v1/cart/';

const router = Router();

// Create a new Cart
router.post('/', createCartHandler);

// Delete a Cart
router.get('/getCart', getCartsHandler);

// Delete a Cart
router.delete('/:id', deleteCartHandler);

// TODO: Remove this later.
// // Get a Cart by ID or get all Carts
// router.get('/', getCartsHandler);

export { router as cartRoutes };
