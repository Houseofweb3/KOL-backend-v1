import express from 'express';
import { verifyAccessToken } from '../../../middleware/auth';
import {
    login,
    signup,
    getUserProfile,
    deactivateUser,
    refreshTokenhandler,
    logoutController,
    generateOTP
} from '../../../controllers/v1/auth/userController';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logoutController);
router.post('/refresh-token', refreshTokenhandler);
router.get('/profile/:userId?', getUserProfile);
router.patch('/deactivate/:userId', verifyAccessToken, deactivateUser);
router.post('/generate-otp', generateOTP);

export { router as userRoutes };
