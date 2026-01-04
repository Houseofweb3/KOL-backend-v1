import express from 'express';
import {
    getProposalByTokenController,
    updateAndSubmitProposalController,
} from '../../../controllers/v1/client/proposalClientController';

const router = express.Router();

// Get proposal details by token (public route for clients)
router.get('/:token', getProposalByTokenController);

// Update and submit proposal (public route for clients)
router.put('/:token/submit', updateAndSubmitProposalController);

export { router as proposalClientRoutes };

