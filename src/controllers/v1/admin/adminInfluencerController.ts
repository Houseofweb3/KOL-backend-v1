import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAllInfluencers, createInfluencer, deleteInfluencer, updateInfluencer, getInfluencerById } from '../../../services/v1/admin';

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
        let influencerPayload = contentTypeAndPrice.map(
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


