import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import { fetchInvoiceDetails } from '../../../services/v1/payment/invoiceService';

// Generate Invoice
export const generateInvoiceController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    const { cartId, email, managementFee, managementFeePercentage, totalAmount } = req.body;

    if (!cartId) {
        logger.warn('Missing required fields in generate Invoice');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const { data } = await fetchInvoiceDetails(
            cartId as string,
            email as string,
            managementFee as number,
            managementFeePercentage as number,
            totalAmount as number,
        );

        logger.info('Invoice generated successfully');
        return res.status(HttpStatus.CREATED).json({ data });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error generating invoice: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred while generating invoice');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};
