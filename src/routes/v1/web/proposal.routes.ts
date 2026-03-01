import express from 'express';
import { getProposalByTokenController, submitProposalController } from '../../../controllers/v1/web/proposal.controller';

const router = express.Router();

/** No auth: token in URL validates access. */
router.get('/:token', getProposalByTokenController);
router.post('/:token/submit', submitProposalController);

export const webProposalRoutes = router;
