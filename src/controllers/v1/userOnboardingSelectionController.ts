import { Request, Response } from 'express';
import {
    createUserOnboardingSelection,
    getUserOnboardingSelectionsByUserId
} from '../../services/v1/userOnboardingSelectionService';
import logger from '../../config/logger';
import { setCorsHeaders } from '../../middleware/setcorsHeaders';
export const createUserOnboardingSelectionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { userId, questionId, selectedOptionId } = req.body;

    if (!userId || !questionId || !selectedOptionId) {
        logger.warn('Missing required fields in create user onboarding selection request', questionId, selectedOptionId, userId);
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { message } = await createUserOnboardingSelection(userId, questionId, selectedOptionId);
        return res.status(201).json({ message });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during user onboarding selection creation: ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error', message: `${error.message}` });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }

    }
};

export const getUserOnboardingSelectionsByUserIdController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { userId } = req.params;

    try {
        const userOnboardingSelections = await getUserOnboardingSelectionsByUserId(userId);
        return res.status(200).json(userOnboardingSelections);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching user onboarding selections by user ID: ${error.message}`);
            return res.status(500).json({ error: 'Internal Server Error', message: `${error.message}` });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
