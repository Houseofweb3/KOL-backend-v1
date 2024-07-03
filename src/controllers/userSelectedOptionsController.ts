import { Request, Response } from 'express';
import { processUserSelectedOptions } from '../services/userSelectedOptionsService';
import logger from '../config/logger';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    logger.warn(`Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { user_id, questions } = req.body;

  try {
    if (!user_id || !questions || !Array.isArray(questions) || questions.length === 0) {
      logger.warn('Invalid request body for processing user selected options');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await processUserSelectedOptions(user_id, questions);
    logger.info(`User selected options processed successfully for user_id: ${user_id}`);
    return res.status(200).json({ message: result });
  } catch (error: any) {
    if (error instanceof Error) {
      logger.error('Error processing answers or saving priorities:', error);
      if (error.message === 'Invalid Option') {
        return res.status(400).json({ error: 'Invalid Option', message: 'The selected option is not valid for the given question' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process answers or save priorities' });
    }
    logger.error('Unexpected error during processing user selected options');
    return res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
  }
}
