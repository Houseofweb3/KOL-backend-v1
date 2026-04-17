import express from 'express';
import { clientAuthRoutes } from './client.auth.routes';
import { userAuthRoutes } from './user.auth.routes';
import { webInfluencerRoutes } from './influencer.routes';
import { webCartRoutes } from './cart.routes';
import { webProposalRoutes } from './proposal.routes';
import { creatorOnboardingRoutes } from './creator-onboarding.routes';
import { webBlogRoutes } from './blog.routes';
import { webBlogPublicRoutes } from './blog-public.routes';
import { webBlogPublicImageRoutes } from './blog-public-image.routes';

const router = express.Router();

router.use('/client', clientAuthRoutes);
router.use('/user', userAuthRoutes);
router.use('/influencer', webInfluencerRoutes);
router.use('/cart', webCartRoutes);
router.use('/proposal', webProposalRoutes);
router.use('/creator-onboarding', creatorOnboardingRoutes);
router.use('/blogs/public', webBlogPublicRoutes);
router.use('/blogs', webBlogRoutes);
router.use('/blog-images', webBlogPublicImageRoutes);

export const webRoutes = router;