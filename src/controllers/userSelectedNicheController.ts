import { Request, Response } from 'express';
import { updateUserSelectedNiche } from '../services/userSelectedNicheService';

export const handleUserSelectedNiche = async (req: Request, res: Response) => {
  const { user_id, niche_name } = req.body;

  if (!user_id || !Array.isArray(niche_name)) {
    return res.status(400).json({ message: 'user_id and niche_name are required' });
  }

  try {
    const result = await updateUserSelectedNiche(user_id, niche_name);
    res.status(200).json({ message: result.message, userSelectedNiche: result.data });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user selected niches', error: error.message });
  }
};
