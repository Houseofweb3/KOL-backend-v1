import express from 'express';
import { adminAuthRoutes } from './auth.routes';
import { adminUserRoutes } from './user.routes';
import { adminClientRoutes } from './client.routes';
import { adminInfluencerRoutes } from './influencer.routes';

const router = express.Router();

router.use('/auth', adminAuthRoutes);
router.use('/user', adminUserRoutes);
router.use('/client', adminClientRoutes);
router.use('/influencer', adminInfluencerRoutes);

export const adminRoutes = router;