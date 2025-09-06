import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    createDr,
    fetchDrs,
    fetchDrById,
    updateDr,
    deleteDr,
    CreateDrParams,
    UpdateDrParams,
} from '../../../services/v1/dr';
import { setCorsHeaders } from '../../../middleware';

// fn to create a website
export const createDrController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { website, deliverables, dr, price } = req.body as CreateDrParams;

        const newWebsite = await createDr({ website, deliverables, dr, price });

        return res.status(HttpStatus.CREATED).json({
            message: 'Dr created successfully',
            dr: newWebsite,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An error occurred while creating a dr';

        logger.error(`Error creating dr (${statusCode}): ${errorMessage}`);
        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to fetch all websites
export const fetchDrsController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { page, limit, sortField, sortOrder, searchTerm } = req.query as any;

        const drs = await fetchDrs(
            Number(page) || 1,
            Number(limit) || 10,
            sortField || undefined,
            (sortOrder as 'ASC' | 'DESC') || 'DESC',
            searchTerm || undefined,
        );

        return res.status(HttpStatus.OK).json({
            message: 'DR fetched successfully',
            ...drs,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An error occurred while fetching DR';

        logger.error(`Error fetching DR (${statusCode}): ${errorMessage}`);
        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to fetch website by id
export const fetchDrByIdController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { id } = req.params;
        const dr = await fetchDrById(id);

        return res.status(HttpStatus.OK).json({
            message: 'Dr fetched successfully',
            dr,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An error occurred while fetching dr by id';

        logger.error(`Error fetching dr (${statusCode}): ${errorMessage}`);
        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to update website
export const updateDrController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { id } = req.params;
        const updates = req.body as UpdateDrParams;

        const updatedDr = await updateDr(id, updates);

        return res.status(HttpStatus.OK).json({
            message: 'Dr updated successfully',
            dr: updatedDr,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An error occurred while updating dr';

        logger.error(`Error updating dr (${statusCode}): ${errorMessage}`);
        return res.status(statusCode).json({ error: errorMessage });
    }
};

// fn to delete website
export const deleteDrController = async (req: Request, res: Response) => {
    setCorsHeaders(req, res);

    try {
        const { id } = req.params;

        const result = await deleteDr(id);

        return res.status(HttpStatus.OK).json({
            message: result.message,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An error occurred while deleting dr';

        logger.error(`Error deleting dr (${statusCode}): ${errorMessage}`);
        return res.status(statusCode).json({ error: errorMessage });
    }
};
