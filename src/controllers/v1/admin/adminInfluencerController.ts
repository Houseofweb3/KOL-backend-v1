import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { getAllInfluencers, createInfluencer, deleteInfluencer, updateInfluencer, getInfluencerById } from '../../../services/v1/admin';
import { message } from 'telegram/client';


// get all influencers
export const getAllInfluencersController = async (req: Request, res: Response) => {
    const { page, limit, sort, order } = req.query;
    try {
        const influencers = await getAllInfluencers(+(page || 1), +(limit || 10), sort as string, order as string);
        return res.status(HttpStatus.OK).json({
            influencers,
            page: +(page || 1),
            limit: +(limit || 10),
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
    try {
        const newInfluencer = await createInfluencer(influencer);
        return res.status(HttpStatus.CREATED).json(newInfluencer);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during creating influencer';

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


