import express from 'express';
import { signup, getUserProfile, deactivateUser } from '../controllers/userController';

const router = express.Router();
router.post('/signup', signup);
router.get('/profile/fetch', getUserProfile);
router.post('/deactivate', deactivateUser);

export default router;
