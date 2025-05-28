import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware';
import { sendBookingEmail } from '../../../utils/communication/ses/bountyBookingEmailSender';

interface BountyBookingParams {
    name: string;
    email: string;
    telegramId: string;
    projectURL: string;
}
// fn to create a bounty
export const sendBountyBookingEmail = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { name, email, telegramId, projectURL } = req.body as BountyBookingParams;

        if (!name || !email || !telegramId || !projectURL) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        await sendBookingEmail({ name, email, telegramId, projectURL });

        return res.status(HttpStatus.CREATED).json({
            message: 'Booking submitted successfully',
        });

    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while submitting Booking';

        logger.error(`Error while submitting Booking (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
