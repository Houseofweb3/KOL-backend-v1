import { Request, Response } from 'express';
import { fetchInvoiceDetails } from '../services/invoiceService';
import logger from '../config/logger';

export const getInvoiceDetails = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id) {
    logger.warn('Bad request: Missing user_id');
    return res.status(400).json({ error: 'Bad request' });
  }

  try {
    const invoiceDetails = await fetchInvoiceDetails(user_id as string);

    if (!invoiceDetails) {
      logger.info(`Invoice details not found for user_id: ${String(user_id)}`);
      return res.status(404).json({ message: 'Not found' });
    }

    logger.info(`Invoice details fetched successfully for user_id: ${String(user_id)}`);
    return res.status(200).json({
      message: 'Details fetched successfully 👍',
      filePath: invoiceDetails.filePath
    });
  } catch (error: any) {
    logger.error('Error fetching invoice details:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
