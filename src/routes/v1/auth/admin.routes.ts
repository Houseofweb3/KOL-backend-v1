import express from 'express';
import {
    generateOTP,
    validateOTPController,
    generateEmailOTP,
    validateEmailOTPController
} from '../../../controllers/v1/auth/userController';

const router = express.Router();

router.post('/generate-otp', generateOTP);

router.post('/validate-otp', validateOTPController);

router.post('/generate-email-otp', generateEmailOTP);

router.post('/validate-email-otp', validateEmailOTPController);


export { router as adminAuthRoutes };
