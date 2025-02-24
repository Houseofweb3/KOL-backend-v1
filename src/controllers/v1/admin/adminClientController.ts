import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAllUsers, getUserById, updateUser } from '../../../services/v1/admin';

// get all users
export const getAllUsersController = async (req: Request, res: Response) => {
    const { page, limit, sort, order } = req.query;
    try {
        const users = await getAllUsers(+(page || 1), +(limit || 10), sort as string, order as string);
        return res.status(HttpStatus.OK).json({
            users,
            page: +(page || 1),
            limit: +(limit || 10),
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