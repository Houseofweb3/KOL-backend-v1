import express from 'express';
import { adminRoutes } from './admin/index';
import { webRoutes } from './web/index';

/**
 * All v1 API routes. Mounted at apiBase in app (e.g. /api/v1).
 *   - admin/  → /api/v1/admin (auth: signup, login, logout, OTP + PATCH users/:id)
 *   - web/    → /api/v1/web
 */
const router = express.Router();

router.use('/admin', adminRoutes);
router.use('/web', webRoutes);

export const indexRoutes = router;