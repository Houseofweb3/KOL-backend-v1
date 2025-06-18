import { Router } from 'express';
import {
    createBountySubmissionController,
    fetchBountySubmissionsController,
    editBountySubmissionController,
    fetchBountySubmissionsControllerForAdmin,
    fetchBountyVerifiedSubmissionsControllerForAdmin,
    editClientBountySubmissionController,
    fetchQualifiedBountySubmissionsControllerForAdmin,
    editClientQuelifiedBountySubmissionController,
} from '../../../controllers/v1/bounty/bountySubmissionController';
import { BountySubmissionService } from '../../../services/v1/bounty/bountySubmissionService';

const router = Router();

// Create a new Bounty Submission
router.post('/', createBountySubmissionController);

// Fetch all Bounty Submissions for a specific Bounty Open and Close
router.get('/:bountyId', fetchBountySubmissionsController);

// Fetch all Bounty Submissions for a specific Bounty for admin
router.get('/all/:bountyId', fetchBountySubmissionsControllerForAdmin);



// This is for admin to see all submissions that are verified for a specific bounty
router.get('/all/:bountyId/is-verified', fetchBountyVerifiedSubmissionsControllerForAdmin);

// Edit a specific Bounty Submission by ID
router.put('/:submissionId', editBountySubmissionController);

// Edit a specific Bounty Submission by ID form admin
router.put('/:submissionId/client', editClientBountySubmissionController);


// Fetch all Qualified Bounty Submissions for a specific Bounty for admin
router.get('/all/qualified/:bountyId', fetchQualifiedBountySubmissionsControllerForAdmin);

// Edit a specific QualifiedBounty Submission by ID form admin reward_distributed assign
router.put('/:submissionId/client/qualified', editClientQuelifiedBountySubmissionController);

router.get('/:bountyId/export', async (req, res) => {
    const { bountyId } = req.params;
    await BountySubmissionService.exportSubmissionsAsExcel(bountyId, res);
});

export { router as bountySubmissionRoutes };
