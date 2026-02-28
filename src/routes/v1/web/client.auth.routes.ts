import express from 'express';
import { clientSendOtpController, clientVerifyOtpController, clientSignupController } from '../../../controllers/v1/web/client-auth.controller';

const router = express.Router();

router.post('/auth/send-otp', clientSendOtpController);
router.post('/auth/verify-otp', clientVerifyOtpController);
router.post('/auth/signup', clientSignupController);

export { router as clientAuthRoutes };
