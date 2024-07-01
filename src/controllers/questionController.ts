import { Request, Response } from 'express';
import { createQuestion, getQuestionsWithOptions, updateQuestion, deleteQuestion } from '../services/questionService';

export const createQuestionHandler = async (req: Request, res: Response) => {
  const { admin_id, question, options } = req.body;

  if (!admin_id || !question || !options || !Array.isArray(options)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const createdQuestion = await createQuestion({ admin_id, question, options });
    res.status(201).json({ message: 'Question created successfully', question: createdQuestion });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
};

export const getQuestionsHandler = async (req: Request, res: Response) => {
  try {
    const questions = await getQuestionsWithOptions();
    res.status(200).json(questions);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }
};

export const updateQuestionHandler = async (req: Request, res: Response) => {
  const { question_id, admin_id, question, options } = req.body;

  if (!question_id || !admin_id || !question || !options || !Array.isArray(options)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const updatedQuestion = await updateQuestion({ question_id, admin_id, question, options });
    res.status(200).json({ message: 'Question updated successfully', question: updatedQuestion });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
};

export const deleteQuestionHandler = async (req: Request, res: Response) => {
  const { question_id, admin_id } = req.body;

  if (!question_id || !admin_id) {
    return res.status(400).json({ error: 'question_id and admin_id are required' });
  }

  try {
    const result = await deleteQuestion(question_id, admin_id);
    res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
};
