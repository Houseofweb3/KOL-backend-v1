import { Request, Response } from 'express';
import { createQuestion, getQuestionsWithOptions, updateQuestion, deleteQuestion } from '../services/questionService';
import logger from '../config/logger'; 

export const createQuestionHandler = async (req: Request, res: Response) => {
  console.log('Request Body:', req.body); // Add this line
  const { admin_id, question, options } = req.body;

  try {
    if (!admin_id || !question || !options || !Array.isArray(options)) {
      logger.warn('Invalid request body for creating question');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const createdQuestion = await createQuestion({ admin_id, question, options });
    logger.info(`Question created successfully by admin: ${admin_id}`);
    return res.status(201).json({ message: 'Question created successfully', question: createdQuestion });
  } catch (error: any) {
    logger.error('Error creating question:', error);
    return res.status(500).json({ error: 'Failed to create question' });
  }
};

export const getQuestionsHandler = async (req: Request, res: Response) => {
  try {
    const questions = await getQuestionsWithOptions();
    logger.info('Fetched questions with options successfully');
    return res.status(200).json(questions);
  } catch (error: any) {
    logger.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

export const updateQuestionHandler = async (req: Request, res: Response) => {
  const { question_id, admin_id, question, options } = req.body;

  try {
    if (!question_id || !admin_id || !question || !options || !Array.isArray(options)) {
      logger.warn('Invalid request body for updating question');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const updatedQuestion = await updateQuestion({ question_id, admin_id, question, options });
    logger.info(`Question updated successfully by admin: ${admin_id}`);
    return res.status(200).json({ message: 'Question updated successfully', question: updatedQuestion });
  } catch (error: any) {
    logger.error('Error updating question:', error);
    return res.status(500).json({ error: 'Failed to update question' });
  }
};

export const deleteQuestionHandler = async (req: Request, res: Response) => {
  const { question_id, admin_id } = req.body;

  try {
    if (!question_id || !admin_id) {
      logger.warn('question_id and admin_id are required for deleting question');
      return res.status(400).json({ error: 'question_id and admin_id are required' });
    }

    const result = await deleteQuestion(question_id, admin_id);
    logger.info(`Question deleted successfully by admin: ${admin_id}`);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error deleting question:', error);
    return res.status(500).json({ error: 'Failed to delete question' });
  }
};
