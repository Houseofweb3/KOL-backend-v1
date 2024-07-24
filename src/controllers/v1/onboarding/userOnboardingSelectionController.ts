import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import {
    createUserOnboardingSelection,
    getUserOnboardingSelectionsByUserId
} from '../../../services/v1/onboarding';

export const createUserOnboardingSelectionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { userId, questionId, selectedOptionId } = req.body;

    if (!userId || !questionId || !selectedOptionId) {
        logger.warn('Missing required fields in create user onboarding selection request', questionId, selectedOptionId, userId);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const { message } = await createUserOnboardingSelection(userId, questionId, selectedOptionId);
        return res.status(HttpStatus.CREATED).json({ message });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during user onboarding selection creation: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error', message: `${error.message}` });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }

    }
};

export const getUserOnboardingSelectionsByUserIdController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { userId } = req.params;

    try {
        const userOnboardingSelections = await getUserOnboardingSelectionsByUserId(userId);
        return res.status(HttpStatus.OK).json(userOnboardingSelections);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching user onboarding selections by user ID: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error', message: `${error.message}` });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};
