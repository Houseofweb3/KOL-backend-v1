import express from 'express';
import { signup, getUserProfile } from '../../controllers/v1/userController';

const router = express.Router();


router.post('/signup', signup);
router.get('/profile/:userId', getUserProfile);
// router.patch('/deactivate/:userId', deactivateUser);

export default router;
