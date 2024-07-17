import { Request, Response } from 'express';
import { createQuestion, getQuestions, deleteQuestion } from '../../services/v1/questionService';
import { QuestionType } from '../../entity/onboarding';
import logger from '../../config/logger';

// Create a new question
export const createQuestionController = async (req: Request, res: Response) => {
    const { text, type, description } = req.body;

    //check req fields
    if (!text || !type) {
        logger.warn('Missing required fields in question creation request');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check valid q type
    if (!Object.values(QuestionType).includes(type)) {
        logger.warn('Invalid question type');
        return res.status(400).json({ error: 'Invalid question type' });
    }

    try {
        // create q
        const question = await createQuestion(text, type, description);
        logger.info(`Question created successfully: ${question.id}`);
        return res.status(201).json({ question });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating question: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during question creation');
            return res.status(500).json({ error: 'An unknown error occurred during question creation' });
        }
    }
};

// Fetch questions (all or by ID)
export const getQuestionController = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const questions = await getQuestions(id);

        if (id && questions.length === 0) {
            logger.warn(`Question not found with id: ${id}`);
            return res.status(404).json({ error: 'Question not found' });
        }

        return res.status(200).json({ questions });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching questions: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while fetching questions');
            return res.status(500).json({ error: 'An unknown error occurred while fetching questions' });
        }
    }
};

// Delete Question Handler
export const deleteQuestionController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await deleteQuestion(id);
        return res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting Question: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred during Question deletion');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};