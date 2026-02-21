import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAllUsers, getUserById, updateUser, createClient, getAllClientsForExport } from '../../../services/v1/admin';
import { User } from '../../../entity/auth';

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

// download all clients as CSV (or JSON with ?format=json)
export const downloadClientsController = async (req: Request, res: Response) => {
    const format = ((req.query.format as string) || 'csv').toLowerCase();
    try {
        const clients = await getAllClientsForExport();

        // Normalize: fill fullname from firstName + lastName when empty so CSV columns don't look merged/blank
        const normalized = clients.map((c: User) => {
            const fullname = (c.fullname && String(c.fullname).trim()) || [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '';
            return { ...c, fullname };
        });

        if (format === 'csv') {
            const columns = [
                'id', 'email', 'fullname', 'profilePicture', 'firstName', 'lastName',
                'projectName', 'telegramId', 'projectUrl', 'phoneNumber', 'is_deleted',
                'userType', 'role', 'addressInfo', 'createdAt', 'updatedAt', 'deletedAt'
            ];
            const escapeCsv = (val: unknown): string => {
                if (val == null) return '""';
                const s = val instanceof Date ? val.toISOString() : (typeof val === 'object' ? JSON.stringify(val) : String(val));
                return `"${String(s).replace(/"/g, '""').replace(/\r\n/g, '\n').replace(/\r/g, '\n')}"`;
            };
            const header = columns.map((c) => `"${c}"`).join(',');
            const rows = normalized.map((row: Record<string, unknown>) =>
                columns.map((col) => escapeCsv(row[col])).join(',')
            );
            const csv = [header, ...rows].join('\r\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="clients-export-${new Date().toISOString().slice(0, 10)}.csv"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.status(HttpStatus.OK).send(csv);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="clients-export-${new Date().toISOString().slice(0, 10)}.json"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(HttpStatus.OK).json(normalized);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during client export';
        logger.error(`Error while downloading clients (${statusCode}): ${errorMessage}`);
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


// create client (same payload as signup: required email, password, fullname, type; rest optional / auto)
export const createClientController = async (req: Request, res: Response) => {
    const {
        firstName,
        lastName,
        email,
        password,
        projectName,
        telegramId,
        projectUrl,
        phoneNumber,
        role,
        addressInfo,
        city,
        state,
        zip,
        country,
    } = req.body;

    if (!email || !password) {
        logger.warn('Missing required fields in create client request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields: email, password' });
    }

    try {
        const user = await createClient(
            email,
            password,
            firstName,
            lastName,
            projectName,
            telegramId,
            projectUrl,
            phoneNumber,
            role,
            firstName,
            lastName,
            addressInfo,
        );
        return res.status(HttpStatus.CREATED).json({
            message: 'Client created successfully',
            user,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during creating client';
        logger.error(`Error while creating client (${statusCode}): ${errorMessage}`);
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