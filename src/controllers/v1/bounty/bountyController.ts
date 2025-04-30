import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { createBounty, CreateBountyParams, fetchBounties, BountyStatusFilter, BountySortOption, fetchBountyById, editBounty, EditBountyParams } from '../../../services/v1/bounty';
import { setCorsHeaders } from '../../../middleware';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER } from '../../../services/v1/influencer';

// fn to create a bounty
export const createBountyController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        const { bountyType, bountyName, metadata, prize, startDate, endDate, status, creatorId } = req.body as CreateBountyParams;
        const bounty = await createBounty({ bountyType, bountyName, metadata, prize, startDate, endDate, status, creatorId });
        return res.status(HttpStatus.CREATED).json({
            message: 'Bounty created successfully',
            bounty,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during creating a bounty';

        logger.error(`Error while creating a bounty (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


// fn to fetch bounties
export const fetchBountiesController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        const { statusFilter, bountyType, sortBy, page, limit } = req.query as unknown as {
            statusFilter?: BountyStatusFilter;
            bountyType?: string;
            sortBy?: BountySortOption;
            page?: number;
            limit?: number;
        };

        const bounties = await fetchBounties({
            statusFilter,
            bountyType,
            sortBy,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        });

        return res.status(HttpStatus.OK).json({
            message: 'Bounties fetched successfully',
            ...bounties,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching bounties';

        logger.error(`Error while fetching bounties (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to fetch bounty by id
export const fetchBountyByIdController = async (req: Request, res: Response) => {
    try {
        const { id: bountyId } = req.params;

        const bounty = await fetchBountyById(bountyId);
        return res.status(HttpStatus.OK).json({
            message: 'Bounty fetched successfully',
            bounty,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching a bounty';

        logger.error(`Error while fetching a bounty (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to edit bounty by id
export const editBountyController = async (req: Request, res: Response) => {
    try {
        const { id: bountyId } = req.params;
        const { bountyType, bountyName, metadata, prize, startDate, endDate, status, creatorId } = req.body as EditBountyParams;
        const bounty = await editBounty(bountyId, { bountyType, bountyName, metadata, prize, startDate, endDate, status, creatorId });
        return res.status(HttpStatus.OK).json({
            message: 'Bounty updated successfully',
            bounty,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during updating a bounty';

        logger.error(`Error while updating a bounty (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
