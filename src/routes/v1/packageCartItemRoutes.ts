import { Router } from 'express';
import { createPackageCartItemHandler, deletePackageCartItemHandler, getPackageCartItemsHandler } from '../../controllers/v1/packageCartItemController';

const router = Router();

router.post('/', createPackageCartItemHandler);
router.delete('/:id', deletePackageCartItemHandler);
router.get('/', getPackageCartItemsHandler);

export default router;
