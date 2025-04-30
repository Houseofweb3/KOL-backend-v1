import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { createBountySubmission, fetchBountySubmissions, editBountySubmission } from '../../../services/v1/bounty';


// fn to create a bounty submission
export const createBountySubmissionController = async (req: Request, res: Response) => {
    try {
        const { userId, bountyId, submissionLink } = req.body;
        const bountySubmission = await createBountySubmission({ userId, bountyId, submissionLink });
        return res.status(HttpStatus.CREATED).json({
            message: 'Bounty submission created successfully',
            bountySubmission,
        });
    }
    catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during creating a bounty submission';

        logger.error(`Error while creating a bounty submission (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to fetch all submissions for a bounty
export const fetchBountySubmissionsController = async (req: Request, res: Response) => {
    try {
        const { bountyId } = req.params;
        const submissions = await fetchBountySubmissions(bountyId);
        return res.status(HttpStatus.OK).json({
            message: 'Bounty submissions fetched successfully',
            submissions,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching bounty submissions';

        logger.error(`Error while fetching bounty submissions (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to edit a bounty submission
export const editBountySubmissionController = async (req: Request, res: Response) => {
    try {
        const { submissionId } = req.params;
        const updates = req.body;
        const updatedSubmission = await editBountySubmission(submissionId, updates);
        return res.status(HttpStatus.OK).json({
            message: 'Bounty submission updated successfully',
            updatedSubmission,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during editing a bounty submission';

        logger.error(`Error while editing a bounty submission (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


