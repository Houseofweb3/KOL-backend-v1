import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { wipeDatabase } from '../../../services/v1/admin/wipe-database.service';

/**
 * POST /admin/database/wipe - delete all data from all application tables.
 * Requires admin auth. Use only in dev/staging or when explicitly intended.
 */
export const wipeDatabaseController = async (_req: Request, res: Response) => {
    try {
        const result = await wipeDatabase();
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        logger.error(`Admin wipe database error: ${error.message}`);
        return res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: error.message });
    }
};
