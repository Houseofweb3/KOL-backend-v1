import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAllUsers, getUserById, updateUser } from '../../../services/v1/admin';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;


// get all users
export const getAllUsersController = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const searchTerm = req.query.searchTerm as string || "";
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const sortField = (req.query.sortField as string);
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC');
    try {
        const { users, pagination } = await getAllUsers(page, limit, searchTerm, sortField, sortOrder);
        return res.status(HttpStatus.OK).json({
            users,
            pagination
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching all users';

        logger.error(`Error while fetching all users (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// get user by id
export const getUserByIdController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await getUserById(id);
        return res.status(HttpStatus.OK).json(user);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during fetching user by id';

        logger.error(`Error while fetching user by id (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


// update user
export const updateUserController = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.body;
    try {
        const data = await updateUser(id, user);
        return res.status(HttpStatus.OK).json({
            message: 'User updated successfully',
            data,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during updating user';

        logger.error(`Error while updating user (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};