import express from 'express';
import { adminAuthRoutes } from './auth.routes';
import { adminUserRoutes } from './user.routes';

const router = express.Router();

router.use('/auth', adminAuthRoutes);
router.use('/user', adminUserRoutes);

export const adminRoutes = router;