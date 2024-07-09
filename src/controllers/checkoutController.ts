// import { Request, Response } from 'express';
// import { processCheckout } from '../services/checkoutService';
// import logger from '../config/logger';

// export const checkoutHandler = async (req: Request, res: Response) => {
//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   try {
//     const result = await processCheckout(req.body);
//     logger.info(`Checkout processed successfully for user: ${req.body.user_id}`);
//     return res.status(200).json(result);
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       logger.error(`Failed to process the request: ${error.message}`);
//       return res.status(500).json({ error: 'Failed to process the request', details: error.message });
//     }
//     logger.error('An unknown error occurred during checkout');
//     return res.status(500).json({ error: 'An unknown error occurred' });
//   }
// };
