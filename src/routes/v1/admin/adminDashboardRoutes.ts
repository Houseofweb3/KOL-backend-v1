import express from 'express';

import { dashboardDetails } from '../../../controllers/v1/admin/adminProposalController';

const router = express.Router();

// get user by id route
router.get('/', dashboardDetails);

export { router as adminDashboardRoutes };
