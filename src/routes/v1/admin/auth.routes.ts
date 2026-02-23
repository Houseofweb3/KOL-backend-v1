import express from 'express';
import {
    adminSignupController,
    adminLoginController,
    adminLogoutController,
    sendOtpController,
    verifyOtpController,
} from '../../../controllers/v1/admin/auth.controller';

const router = express.Router();

router.post('/signup', adminSignupController);
router.post('/login', adminLoginController);
router.post('/logout', adminLogoutController);
router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);

export { router as adminAuthRoutes };
