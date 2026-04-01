import express from 'express';
import { verifyAdminAuth } from '../../../middleware/auth';
import { getDashboardStatsController } from '../../../controllers/v1/admin/dashboard-stats.controller';

const router = express.Router();

router.use(verifyAdminAuth);

/** GET /admin/dashboard/stats */
router.get('/stats', getDashboardStatsController);

export { router as adminDashboardStatsRoutes };
