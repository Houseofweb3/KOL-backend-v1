import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware';
import { fetchBountySubmissionsByStatus } from '../../../services/v1/bounty';

export const userProfileGet = async (req: Request, res: Response) => {
    // setCorsHeaders(req, res);

    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required.' });
        }
        
        const data = await fetchBountySubmissionsByStatus(userId);

        return res.status(HttpStatus.OK).json({
            message: 'Bounties fetched successfully',
            ...data,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching user profiles';

        logger.error(`Error while fetching user profile (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
