import express from 'express';
import { userSendOtpLoginController, userVerifyOtpLoginController } from '../../../controllers/v1/web/user-auth.controller';

const router = express.Router();

router.post('/auth/send-otp', userSendOtpLoginController);
router.post('/auth/verify-otp', userVerifyOtpLoginController);

export { router as userAuthRoutes };
