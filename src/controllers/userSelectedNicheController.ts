import { Request, Response } from 'express';
import { updateUserSelectedNiche } from '../services/userSelectedNicheService';
import logger from '../config/logger';

export const handleUserSelectedNiche = async (req: Request, res: Response) => {
  const { user_id, niche_name } = req.body;

  try {
    if (!user_id || !niche_name || !Array.isArray(niche_name) || niche_name.length === 0) {
      logger.warn('Invalid request body for updating user selected niches');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const result = await updateUserSelectedNiche(user_id, niche_name);
    logger.info(`User selected niches updated successfully for user_id: ${user_id}`);
    return res.status(200).json({ message: result.message, userSelectedNiche: result.data });
  } catch (error: any) {
    logger.error('Error updating user selected niches:', error);
    return res.status(500).json({ error: 'Error updating user selected niches', message: error.message });
  }
};
