import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    createBounty,
    CreateBountyParams,
    fetchBounties,
    BountyStatusFilter,
    BountySortOption,
    fetchBountyById,
    editBounty,
    EditBountyParams,
    fetchBountyByUserId,
} from '../../../services/v1/bounty';
import { setCorsHeaders } from '../../../middleware';
import { uploadImageToS3 } from '../../../utils/S3';

// fn to create a bounty
export const createBountyController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        if (!files.logo || !files.coverImage) {
            return res.status(400).json({ error: 'Both image1 and image2 are required.' });
        }

        let parsedMetadata: Record<string, any> = {};
        parsedMetadata =
            typeof req.body.metadata === 'string'
                ? JSON.parse(req.body.metadata)
                : req.body.metadata || {};

        const logo = await uploadImageToS3(files.logo[0]);
        const coverImage = await uploadImageToS3(files.coverImage[0]);

        const updatedMetadata = {
            ...parsedMetadata,
            logo: logo,
            coverImage: coverImage,
        };

        const { bountyType, bountyName, prize, startDate, endDate, status, creatorId } =
            req.body as CreateBountyParams;

        const bounty = await createBounty({
            bountyType,
            bountyName,
            metadata: updatedMetadata,
            prize,
            startDate,
            endDate,
            status,
            creatorId,
        });
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
            notInclude: 'draft',
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
// fn to fetch bounties
export const fetchAllBountiesController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        const { statusFilter, bountyType, sortBy, page, limit, searchTerm } =
            req.query as unknown as {
                statusFilter?: BountyStatusFilter;
                bountyType?: string;
                sortBy?: BountySortOption;
                page?: number;
                limit?: number;
                searchTerm?: string;
            };

        const bounties = await fetchBounties({
            statusFilter,
            bountyType,
            sortBy,
            searchTerm,
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
    setCorsHeaders(req, res);

    try {
        const { id: bountyId } = req.params;
        const { bountyType, bountyName, metadata, prize, startDate, endDate, status, creatorId } =
            req.body as CreateBountyParams;

            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };
    
            let logo = req.body.logo
            let coverImage = req.body.coverImage;

            if (files.logo || files.coverImage) {
                logo = await uploadImageToS3(files.logo[0]);
                coverImage = await uploadImageToS3(files.coverImage[0]);
            }
    
            let parsedMetadata: Record<string, any> = {};
            parsedMetadata =
                typeof req.body.metadata === 'string'
                    ? JSON.parse(req.body.metadata)
                    : req.body.metadata || {};
    
          
    
            const updatedMetadata = {
                ...parsedMetadata,
                logo: logo,
                coverImage: coverImage,
            };

        const bounty = await editBounty(bountyId, {
            bountyType,
            bountyName,
            metadata: updatedMetadata,
            prize,
            startDate,
            endDate,
            status,
            creatorId,
        });
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

// fn to fetch user submission bounty by userid
export const fetchUserSubmissionBountiesController = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const { statusFilter, bountyType, sortBy, page, limit } = req.query as unknown as {
            statusFilter?: BountyStatusFilter;
            bountyType?: string;
            sortBy?: BountySortOption;
            page?: number;
            limit?: number;
        };
        const bounty = await fetchBountyByUserId({
            userId,
            statusFilter,
            bountyType,
            sortBy,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        });
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
