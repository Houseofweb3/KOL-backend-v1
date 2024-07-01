import { Request, Response, NextFunction } from 'express';
import checkoutService from '../services/checkoutService';

export const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.method === 'POST') {
    try {
      const response = await checkoutService(req.body);
      res.status(200).json(response);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to process the request', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
