import { Router } from 'express';
import {
    createPackageItemHandler,
    updatePackageItemHandler,
    deletePackageItemHandler,
    getPackageItemsHandler
} from '../../../controllers/v1/package';

const router = Router();

router.post('/', createPackageItemHandler);

// Update a PackageItem
router.put('/:id', updatePackageItemHandler);

router.delete('/:id', deletePackageItemHandler);

// Get a PackageItem by ID or get all PackageItems
router.get('/:id?', getPackageItemsHandler);

export { router as packageItemRoutes };
