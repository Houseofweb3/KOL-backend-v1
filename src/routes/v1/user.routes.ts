import express from 'express';
import { signup, getUserProfile, deactivateUser, login, refreshTokenhandler} from '../../controllers/v1/userController';
import { verifyAccessToken } from '../../middleware/auth';

const router = express.Router();


router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshTokenhandler);
router.get('/profile/:userId?', verifyAccessToken, getUserProfile);
router.patch('/deactivate/:userId', verifyAccessToken, deactivateUser);

export default router;
