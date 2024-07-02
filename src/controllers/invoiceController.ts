import { Request, Response } from 'express';
import { fetchInvoiceDetails } from '../services/invoiceService';

export const getInvoiceDetails = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const invoiceDetails = await fetchInvoiceDetails(user_id as string);
    
    if (!invoiceDetails) {
      return res.status(404).json({ message: 'No details found' });
    }

    return res.status(200).json({
      message: 'Invoice details fetched successfully',
      filePath: invoiceDetails.filePath
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
