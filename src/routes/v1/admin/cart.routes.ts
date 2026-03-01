import express from 'express';
import { listCartsController, getCartController, createCartController, updateCartController, deleteCartController } from '../../../controllers/v1/admin/cart.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/', listCartsController);
router.get('/:id', getCartController);
router.post('/', createCartController);
router.patch('/:id', updateCartController);
router.delete('/:id', deleteCartController);

export { router as adminCartRoutes };
