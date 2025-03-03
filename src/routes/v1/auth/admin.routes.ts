import express from 'express';
import {
    generateOTP,
    validateOTPController
} from '../../../controllers/v1/auth/userController';

const router = express.Router();

router.post('/generate-otp', generateOTP);

router.post('/validate-otp', validateOTPController);


export { router as adminAuthRoutes };
