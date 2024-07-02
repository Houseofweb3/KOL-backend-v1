import { Request, Response } from 'express';
import { processCheckout } from '../services/checkoutService';

export const checkoutHandler = async (req: Request, res: Response) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await processCheckout(req.body);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ error: 'Failed to process the request', details: error.message });
    }
    return res.status(500).json({ error: 'An unknown error occurred' });
  }
};
