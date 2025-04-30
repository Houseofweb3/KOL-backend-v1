import { Router } from 'express';
import { createBountySubmissionController, fetchBountySubmissionsController, editBountySubmissionController } from '../../../controllers/v1/bounty/bountySubmissionController';

const router = Router();

// Create a new Bounty Submission
router.post('/', createBountySubmissionController);
// Fetch all Bounty Submissions for a specific Bounty
router.get('/:bountyId', fetchBountySubmissionsController);
// Edit a specific Bounty Submission by ID
router.put('/:submissionId', editBountySubmissionController);

export { router as bountySubmissionRoutes };