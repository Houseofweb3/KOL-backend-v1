import { Request, Response } from 'express';
import {
    createOnBoardingQuestion,
    getOnBoardingQuestionById,
    getAllOnBoardingQuestions
} from '../../services/v1/onboardingQuestionService';
import logger from '../../config/logger';
import { setCorsHeaders } from '../../middleware/setcorsHeaders';
export const createOnBoardingQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { isRequired, order, questionId } = req.body;

    if (!order || !questionId || !isRequired) {
        logger.warn('Missing required fields in create OnBoardingQuestion request');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { onBoardingQuestion, message } = await createOnBoardingQuestion(questionId, isRequired, order);
        return res.status(201).json({ onBoardingQuestion, message });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during OnBoardingQuestion creation: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during OnBoardingQuestion creation');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

export const getOnBoardingQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    try {
        const OnBoardingQuestion = await getOnBoardingQuestionById(id);
        return res.status(200).json(OnBoardingQuestion);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching OnBoardingQuestion by ID: ${error.message}`);
            return res.status(404).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching OnBoardingQuestion');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

export const getAllOnBoardingQuestionsController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        const OnBoardingQuestions = await getAllOnBoardingQuestions();
        return res.status(200).json(OnBoardingQuestions);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching all OnBoardingQuestions: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching all OnBoardingQuestions');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};

