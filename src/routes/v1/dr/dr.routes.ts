import { Router } from 'express';
import {
    createDrController,
    fetchDrByIdController,
    updateDrController,
    deleteDrController,
    fetchDrsController,
} from '../../../controllers/v1/dr';

const router = Router();

// Create a new Website
router.post('/', createDrController);

// Fetch all Websites with pagination
router.get('/', fetchDrsController);

// Fetch a specific Website by ID
router.get('/:id', fetchDrByIdController);

// Update a specific Website by ID
router.put('/:id', updateDrController);

// Delete a specific Website by ID
router.delete('/:id', deleteDrController);

export { router as dkRoutes };
