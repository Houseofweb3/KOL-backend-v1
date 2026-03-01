import express from 'express';
import { wipeDatabaseController } from '../../../controllers/v1/admin/wipe-database.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();


/** Delete all data from all application tables. */
router.post('/wipe', wipeDatabaseController);

export { router as adminDatabaseRoutes };
