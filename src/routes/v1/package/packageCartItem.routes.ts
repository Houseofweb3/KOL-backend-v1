import { Router } from 'express';
import {
    createPackageCartItemHandler,
    deletePackageCartItemHandler,
    getPackageCartItemsHandler
} from '../../../controllers/v1/package';

const router = Router();

router.post('/', createPackageCartItemHandler);
router.delete('/:id', deletePackageCartItemHandler);
router.get('/', getPackageCartItemsHandler);

export { router as packageCartItemRoutes };
