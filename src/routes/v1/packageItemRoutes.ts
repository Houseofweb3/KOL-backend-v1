import { Router } from 'express';
import {
    createPackageItemHandler,
    updatePackageItemHandler,
    deletePackageItemHandler,
    getPackageItemsHandler
} from '../../controllers/v1/packageItemController';

const router = Router();

// Create a new PackageItem
router.post('/', createPackageItemHandler);

// Update a PackageItem
router.put('/:id', updatePackageItemHandler);

// Delete a PackageItem
router.delete('/:id', deletePackageItemHandler);

// Get a PackageItem by ID or get all PackageItems
router.get('/:id?', getPackageItemsHandler);

export default router;
