import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAllInfluencers, createInfluencer, deleteInfluencer, updateInfluencer, getInfluencerById, getUniqueInfluencers } from '../../../services/v1/admin';
import { setCorsHeaders } from '../../../middleware';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_ORDER } from '../../../services/v1/influencer';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// get all influencers
export const getAllInfluencersController = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const searchTerm = req.query.searchTerm as string || "";
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const sortField = (req.query.sortField as string);
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC');
    try {
        const { influencers, pagination } = await getAllInfluencers(page, limit, searchTerm, sortField, sortOrder);
        return res.status(HttpStatus.OK).json({
            influencers,
            pagination
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching all influencers';

        logger.error(`Error while fetching all influencers (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// get all unique influencers
export const getUniqueInfluencersHandler = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);
    try {
        // Extract query parameters for pagination and sorting
        const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
        const followerRange = req.query.followerRange as string || "";
        const priceRange = req.query.priceRange as string || "";
        const searchTerm = req.query.searchTerm as string || "";
        const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
        const sortField = (req.query.sortField as string) || DEFAULT_SORT_FIELD;
        const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || DEFAULT_SORT_ORDER;
        const userId = req.query.userId as string;

        let filter: Record<string, any> = {};

        // Parse the filter query parameters safely
        try {
            filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
        } catch (error) {
            logger.error('Error parsing filter query parameter:', error);
            filter = {};
        }


        // Fetch unique influencers
        const { influencers, pagination } = await getUniqueInfluencers(
            userId,
            page,
            limit,
            sortField,
            sortOrder,
            searchTerm,
            filter,
            followerRange,
            priceRange
        );

        logger.info(`Fetched unique influencers for page ${page}, limit ${limit}`);

        return res.status(HttpStatus.OK).json({
            pagination,
            influencers,
        });
    } catch (error) {
        if (error instanceof Error) {
            logger.error('Error fetching unique influencers:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching unique influencers', error: error.message });
        } else {
            logger.error('An unknown error occurred during unique influencer fetching');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
        }
    }
};

// get influencer by id
export const getInfluencerByIdController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const influencer = await getInfluencerById(id);
        return res.status(HttpStatus.OK).json(influencer);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching influencer by id';

        logger.error(`Error while fetching influencer by id (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


// create influencer
export const createInfluencerController = async (req: Request, res: Response) => {
    const influencer = req.body;
    const { contentTypeAndPrice } = influencer;
    if (!contentTypeAndPrice) {
        return res
            .status(HttpStatus.BAD_REQUEST)
            .json({ error: 'contentTypeAndPrice is required' });
    }
    try {
        // create multiple influencers as per the payload generated on the basis of contentTypeAndPrice array
        const influencerPayload = contentTypeAndPrice.map(
            ({ contentType, price }: { contentType: string; price: number }) => {
                // Exclude `contentTypeAndPrice` field from new influencer object
                const { contentTypeAndPrice: _, ...filteredInfluencer } = influencer;

                return {
                    ...filteredInfluencer,
                    contentType,
                    price,
                };
            },
        );

        const newInfluencers = await createInfluencer(influencerPayload);
        return res.status(HttpStatus.CREATED).json(newInfluencers);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred during creating influencer';

        logger.error(`Error while creating influencer (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// update influencer
export const updateInfluencerController = async (req: Request, res: Response) => {
    const { id } = req.params;
    const influencer = req.body;
    try {
        const updated = await updateInfluencer(id, influencer);
        return res.status(HttpStatus.OK).json({
            message: 'Influencer updated successfully',
            updated
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during updating influencer';

        logger.error(`Error while updating influencer (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


// delete influencer
export const deleteInfluencerController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deleted = await deleteInfluencer(id);
        return res.status(HttpStatus.OK).json({
            message: 'Influencer deleted successfully',
            deleted
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during deleting influencer';

        logger.error(`Error while deleting influencer (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


