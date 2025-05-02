import { Router } from 'express';
import { createBountySubmissionController, fetchBountySubmissionsController, editBountySubmissionController } from '../../../controllers/v1/bounty/bountySubmissionController';
import { BountySubmissionService } from "../../../services/v1/bounty/bountySubmissionService";

const router = Router();

// Create a new Bounty Submission
router.post('/', createBountySubmissionController);
// Fetch all Bounty Submissions for a specific Bounty
router.get('/:bountyId', fetchBountySubmissionsController);
// Edit a specific Bounty Submission by ID
router.put('/:submissionId', editBountySubmissionController);

router.get("/:bountyId/export", async (req, res) => {
    const { bountyId } = req.params;
    await BountySubmissionService.exportSubmissionsAsExcel(bountyId, res);
});

export { router as bountySubmissionRoutes };