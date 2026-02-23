import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    getAllUsers,
    updateVerificationStatus,
    deleteUser,
} from '../../../services/v1/admin/user.service';

/** GET /admin/user - list users with pagination and search (admin only).
 * Query: ?page=1&limit=10&search=email&includeDeleted=true
 */
export const getAllUsersController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const includeDeleted = req.query.includeDeleted === 'true';

        const result = await getAllUsers({ page, limit, search, includeDeleted });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get all users error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** PATCH /admin/user/:id - update is_verified (admin only). Body: { isVerified: boolean } */
export const updateVerificationStatusController = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const isVerified = req.body.isVerified;
    if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'User id is required' });
    }
    if (typeof isVerified !== 'boolean') {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'isVerified must be a boolean' });
    }
    try {
        const { user } = await updateVerificationStatus(userId, isVerified);
        return res.status(HttpStatus.OK).json({ message: 'User verification updated', user });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update verification error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** DELETE /admin/user/:id - soft-delete user (admin only). */
export const deleteUserController = async (req: Request, res: Response) => {
    const userId = req.params.id;
    if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'User id is required' });
    }
    try {
        const { user } = await deleteUser(userId);
        return res.status(HttpStatus.OK).json({ message: 'User deleted', user });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete user error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
