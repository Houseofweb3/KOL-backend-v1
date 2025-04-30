import { Router } from 'express';
import { createBountyController, fetchBountiesController, fetchBountyByIdController, editBountyController } from '../../../controllers/v1/bounty/bountyController';

const router = Router();

// Create a new Bounty
router.post('/', createBountyController);
// Fetch Bounties with optional filters and pagination
router.get('/', fetchBountiesController);
// Fetch a specific Bounty by ID
router.get('/:id', fetchBountyByIdController);
// Edit a specific Bounty by ID
router.put('/:id', editBountyController);

export { router as bountyRoutes };