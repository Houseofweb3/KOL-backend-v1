import { Router } from 'express';
import {
    createUserOnboardingSelectionController,
    getUserOnboardingSelectionsByUserIdController
} from '../../controllers/v1/userOnboardingSelectionController';

const router = Router();

// Create a new user onboarding selection under a specific question
router.post('/', createUserOnboardingSelectionController);

// Get all user onboarding selections for a specific user under a specific question
router.get('/:userId', getUserOnboardingSelectionsByUserIdController);

export default router;
