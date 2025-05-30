import { Router } from 'express';
import {
    createBountyController,
    fetchBountiesController,
    fetchBountyByIdController,
    editBountyController,
    fetchAllBountiesController,
    fetchUserSubmissionBountiesController,
} from '../../../controllers/v1/bounty/bountyController';
import multer from 'multer';

const router = Router();
const upload = multer();

// Create a new Bounty
router.post('/', upload.fields([{ name: 'logo' }, { name: 'coverImage' }]), createBountyController);

// Fetch Bounties with optional filters and pagination
router.get('/', fetchBountiesController);

// Fetch Bounties with optional filters and pagination for admin
router.get('/all', fetchAllBountiesController);
// Fetch a specific Bounty by ID
router.get('/:id', fetchBountyByIdController);
// Edit a specific Bounty by ID
router.put('/:id', upload.fields([{ name: 'logo' }, { name: 'coverImage' }]), editBountyController);

// Fetch a specific user submission Bounties list by userId
router.get('/my/submission/:userId', fetchUserSubmissionBountiesController);
export { router as bountyRoutes };
