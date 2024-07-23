import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import {
    createOnBoardingQuestion,
    getOnBoardingQuestionById,
    getAllOnBoardingQuestions
} from '../../../services/v1/onboarding';

// TODO: Check if prettier and eslint are working or not

export const createOnBoardingQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { isRequired, order, questionId } = req.body;

    // TODO: are there better way for validations.
    if (!order || !questionId || !isRequired) {
        logger.warn('Missing required fields in create OnBoardingQuestion request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const { onBoardingQuestion, message } = await createOnBoardingQuestion(questionId, isRequired, order);
        return res.status(HttpStatus.CREATED).json({ onBoardingQuestion, message });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during OnBoardingQuestion creation: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

export const getOnBoardingQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    try {
        const OnBoardingQuestion = await getOnBoardingQuestionById(id);
        return res.status(HttpStatus.OK).json(OnBoardingQuestion);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching OnBoardingQuestion by ID: ${error.message}`);
            return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching OnBoardingQuestion');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

export const getAllOnBoardingQuestionsController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        const OnBoardingQuestions = await getAllOnBoardingQuestions();
        return res.status(HttpStatus.OK).json(OnBoardingQuestions);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching all OnBoardingQuestions: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching all OnBoardingQuestions');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

