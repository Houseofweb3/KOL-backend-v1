import { Router } from 'express';
import {
    createOnBoardingQuestionController,
    getOnBoardingQuestionController,
    getAllOnBoardingQuestionsController
} from '../../../controllers/v1/onboarding';

const router = Router();

router.post('/', createOnBoardingQuestionController);
router.get('/:id', getOnBoardingQuestionController);
router.get('/', getAllOnBoardingQuestionsController);

export { router as onboardingQuestionsRoutes };
