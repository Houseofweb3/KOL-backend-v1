import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { createProposalLink } from '../../../services/v1/admin/proposal-link.service';

/**
 * POST /admin/cart/:id/proposal-link - create one-time proposal link for cart. Returns { url, token } to send in email.
 */
export const createProposalLinkController = async (req: Request, res: Response) => {
    try {
        const result = await createProposalLink(req.params.id);
        return res.status(HttpStatus.CREATED).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin create proposal link error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
