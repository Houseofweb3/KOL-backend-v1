import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getAdminDashboardStats } from '../../../services/v1/admin/dashboard-stats.service';

/**
 * GET /admin/dashboard/stats — aggregated influencers, proposals (carts), clients.
 */
export const getDashboardStatsController = async (_req: Request, res: Response) => {
    try {
        const stats = await getAdminDashboardStats();
        return res.status(HttpStatus.OK).json(stats);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        logger.error(`Admin dashboard stats error: ${message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: message });
    }
};
