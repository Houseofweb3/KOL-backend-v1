import express from 'express';
import { clientAuthRoutes } from './client.auth.routes';
import { webInfluencerRoutes } from './influencer.routes';
import { webCartRoutes } from './cart.routes';
import { webProposalRoutes } from './proposal.routes';
import { creatorOnboardingRoutes } from './creator-onboarding.routes';

const router = express.Router();

router.use('/client', clientAuthRoutes);
router.use('/influencer', webInfluencerRoutes);
router.use('/cart', webCartRoutes);
router.use('/proposal', webProposalRoutes);
router.use('/creator-onboarding', creatorOnboardingRoutes);

export const webRoutes = router;