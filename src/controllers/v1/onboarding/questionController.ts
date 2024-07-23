import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { QuestionType } from '../../../entity/onboarding';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import { createQuestion, getQuestions, deleteQuestion } from '../../../services/v1/onboarding';

// Create a new question
export const createQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { text, type, description } = req.body;

    //check req fields
    if (!text || !type) {
        logger.warn('Missing required fields in question creation request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    // Check valid q type
    if (!Object.values(QuestionType).includes(type)) {
        logger.warn('Invalid question type');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid question type' });
    }

    try {
        // create q
        const question = await createQuestion(text, type, description);
        logger.info(`Question created successfully: ${question.id}`);
        return res.status(HttpStatus.CREATED).json({ question });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating question: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during question creation');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred during question creation' });
        }
    }
};

// Fetch questions (all or by ID)
export const getQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;

    try {
        const questions = await getQuestions(id);

        if (id && questions.length === 0) {
            logger.warn(`Question not found with id: ${id}`);
            return res.status(HttpStatus.NOT_FOUND).json({ error: 'Question not found' });
        }

        return res.status(HttpStatus.OK).json({ questions });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching questions: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching questions');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred while fetching questions' });
        }
    }
};

// Delete Question Handler
export const deleteQuestionController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { id } = req.params;
    try {
        await deleteQuestion(id);
        return res.status(HttpStatus.OK).json({ message: 'Question deleted successfully' });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting Question: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during Question deletion');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};