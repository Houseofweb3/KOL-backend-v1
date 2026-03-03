import express from 'express';
import { creatorOnboardingController } from '../../../controllers/v1/web/creator-onboarding.controller';

const router = express.Router();

/** No auth: public creator onboarding form. */
router.post('/', creatorOnboardingController);

export { router as creatorOnboardingRoutes };
