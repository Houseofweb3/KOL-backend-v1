import express from 'express';
import { verifyAccessToken } from '../../../middleware/auth';
import {
    login,
    signup,
    getUserProfile,
    deactivateUser,
    refreshTokenhandler,
    logoutController,
    generateOTP,
    userVerify
} from '../../../controllers/v1/auth/userController';
import {
    userClientSignupController,
    userClientLoginController,
    userClientLoginOtpController,
} from '../../../controllers/v1/auth/userClientAuthController';

const router = express.Router();

// User (client) auth – JWT 3 days, no refresh token
router.post('/client/signup', userClientSignupController);
router.post('/client/login', userClientLoginController);
router.post('/client/login-otp', userClientLoginOtpController);

router.post('/login', login);
router.post('/signup', signup);
router.post('/verify/user', userVerify);
router.post('/logout', logoutController);
router.post('/refresh-token', refreshTokenhandler);
router.get('/profile/:userId?', getUserProfile);
router.patch('/deactivate/:userId', verifyAccessToken, deactivateUser);
router.post('/generate-otp', generateOTP);

export { router as userRoutes };
