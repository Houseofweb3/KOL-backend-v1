import express from 'express';
import { clientAuthRoutes } from './client.auth.routes';
import { webInfluencerRoutes } from './influencer.routes';
import { webCartRoutes } from './cart.routes';
import { webProposalRoutes } from './proposal.routes';

const router = express.Router();

router.use('/client', clientAuthRoutes);
router.use('/influencer', webInfluencerRoutes);
router.use('/cart', webCartRoutes);
router.use('/proposal', webProposalRoutes);

export const webRoutes = router;