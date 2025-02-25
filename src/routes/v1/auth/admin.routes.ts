import express from 'express';
import {
    generateOTP
} from '../../../controllers/v1/auth/userController';

const router = express.Router();

router.post('/generate-otp', generateOTP);

export { router as adminAuthRoutes };
