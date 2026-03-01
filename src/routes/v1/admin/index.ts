import express from 'express';
import { adminAuthRoutes } from './auth.routes';
import { adminUserRoutes } from './user.routes';
import { adminClientRoutes } from './client.routes';
import { adminInfluencerRoutes } from './influencer.routes';
import { adminCartRoutes } from './cart.routes';

const router = express.Router();

router.use('/auth', adminAuthRoutes);
router.use('/user', adminUserRoutes);
router.use('/client', adminClientRoutes);
router.use('/influencer', adminInfluencerRoutes);
router.use('/cart', adminCartRoutes);

export const adminRoutes = router;