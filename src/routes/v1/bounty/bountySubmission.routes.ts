import { Router } from 'express';
import { createBountySubmissionController, fetchBountySubmissionsController, editBountySubmissionController, fetchBountySubmissionsControllerForAdmin } from '../../../controllers/v1/bounty/bountySubmissionController';
import { BountySubmissionService } from "../../../services/v1/bounty/bountySubmissionService";

const router = Router();

// Create a new Bounty Submission
router.post('/', createBountySubmissionController);

// Fetch all Bounty Submissions for a specific Bounty Open and Close
router.get('/:bountyId', fetchBountySubmissionsController);

// Fetch all Bounty Submissions for a specific Bounty for admin
router.get('/all/:bountyId', fetchBountySubmissionsControllerForAdmin);

// Edit a specific Bounty Submission by ID
router.put('/:submissionId', editBountySubmissionController);

router.get("/:bountyId/export", async (req, res) => {
    const { bountyId } = req.params;
    await BountySubmissionService.exportSubmissionsAsExcel(bountyId, res);
});

export { router as bountySubmissionRoutes };