import express from 'express';
import { verifyAccessToken } from '../../../middleware/auth';
import {
    login,
    signup,
    getUserProfile,
    deactivateUser,
    refreshTokenhandler,
    logoutController
} from '../../../controllers/v1/auth/userController';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', verifyAccessToken, logoutController);
router.post('/refresh-token', refreshTokenhandler);
router.get('/profile/:userId?', verifyAccessToken, getUserProfile);
router.patch('/deactivate/:userId', verifyAccessToken, deactivateUser);

export default router;
