import express from 'express';
import { listCartsController, getCartController, getCartProposalPdfController, createCartController, updateCartController, deleteCartController } from '../../../controllers/v1/admin/cart.controller';
import { createProposalLinkController } from '../../../controllers/v1/admin/proposal-link.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/', listCartsController);
router.get('/:id/proposal-pdf', getCartProposalPdfController);
router.post('/:id/proposal-link', createProposalLinkController);
router.get('/:id', getCartController);
router.post('/', createCartController);
router.patch('/:id', updateCartController);
router.delete('/:id', deleteCartController);

export { router as adminCartRoutes };
