import express from 'express';
import { clientAuthRoutes } from './client.auth.routes';
import { webInfluencerRoutes } from './influencer.routes';
import { webCartRoutes } from './cart.routes';

const router = express.Router();

router.use('/client', clientAuthRoutes);
router.use('/influencer', webInfluencerRoutes);
router.use('/cart', webCartRoutes);

export const webRoutes = router;