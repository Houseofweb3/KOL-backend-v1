import express from 'express';
import {
    generateOTP,
    validateOTPController,
    generateEmailOTP,
    validateEmailOTPController
} from '../../../controllers/v1/auth/userController';
import {
    adminSignupController,
    adminLoginController,
    adminLogoutController,
} from '../../../controllers/v1/auth/adminAuthController';

const router = express.Router();

// Admin auth (separate Admin model) – JWT 3 days, no refresh token
router.post('/signup', adminSignupController);
router.post('/login', adminLoginController);
router.post('/logout', adminLogoutController);

router.post('/generate-otp', generateOTP);
router.post('/validate-otp', validateOTPController);
router.post('/generate-email-otp', generateEmailOTP);
router.post('/validate-email-otp', validateEmailOTPController);

export { router as adminAuthRoutes };
