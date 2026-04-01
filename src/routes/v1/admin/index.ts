import express from 'express';
import { adminAuthRoutes } from './auth.routes';
import { adminUserRoutes } from './user.routes';
import { adminClientRoutes } from './client.routes';
import { adminInfluencerRoutes } from './influencer.routes';
import { adminCartRoutes } from './cart.routes';
import { adminDatabaseRoutes } from './database.routes';
import { adminMediaRoutes } from './media.routes';
import { adminDashboardStatsRoutes } from './dashboard-stats.routes';
import { adminRateRoutes } from './rate.routes';

const router = express.Router();

router.use('/auth', adminAuthRoutes);
router.use('/user', adminUserRoutes);
router.use('/client', adminClientRoutes);
router.use('/influencer', adminInfluencerRoutes);
router.use('/cart', adminCartRoutes);
router.use('/database', adminDatabaseRoutes);
router.use('/media', adminMediaRoutes);
router.use('/rate', adminRateRoutes);
router.use('/dashboard', adminDashboardStatsRoutes);

export const adminRoutes = router;