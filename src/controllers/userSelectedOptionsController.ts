import { Request, Response } from 'express';
import { processUserSelectedOptions } from '../services/userSelectedOptionsService';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { user_id, questions } = req.body;

  try {
    const result = await processUserSelectedOptions(user_id, questions);
    res.status(200).json({ message: result });
  } catch (error: any) {
    console.error('Error processing answers or saving priorities:', error);
    if (error.message === 'Invalid Option') {
      res.status(400).json({ error: 'Invalid Option', message: 'The selected option is not valid for the given question' });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process answers or save priorities' });
    }
  }
}
