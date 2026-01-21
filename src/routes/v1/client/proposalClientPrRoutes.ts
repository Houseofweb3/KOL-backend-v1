import express from 'express';
import {
    getProposalPrByTokenController,
    updateAndSubmitProposalPrController,
} from '../../../controllers/v1/client/proposalClientPrController';

const router = express.Router();

// Get proposal-pr details by token (public route for clients)
router.get('/:token', getProposalPrByTokenController);

// Update and submit proposal-pr (public route for clients)
router.put('/:token/submit', updateAndSubmitProposalPrController);

export { router as proposalClientPrRoutes };
