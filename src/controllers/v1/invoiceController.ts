import { Request, Response } from 'express';
import { fetchInvoiceDetails } from '../../services/v1/invoiceService';
import logger from '../../config/logger';


// Generate an Invoice
export const generateInvoiceController = async (req: Request, res: Response) => {
    const { userId, id } = req.body;

    if (!id || userId) {
        logger.warn('Missing required fields in generate Invoice');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, filePath } = await fetchInvoiceDetails(id as string, userId as string);
        logger.info(`Influencer created successfully`);
        return res.status(201).json({ data, filePath });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating influencer: ${error.message}`);
            return res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while creating influencer');
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};