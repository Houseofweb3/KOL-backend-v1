import express from 'express';
import {
    getAllUsersController,
    updateVerificationStatusController,
    deleteUserController,
} from '../../../controllers/v1/admin/user.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();

// All routes require admin token
router.use(verifyAdminAuth);

router.get('/', getAllUsersController);
router.patch('/:id', updateVerificationStatusController);
router.delete('/:id', deleteUserController);

export { router as adminUserRoutes };
