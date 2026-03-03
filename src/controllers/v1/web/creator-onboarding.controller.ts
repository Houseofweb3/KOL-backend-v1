import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { submitCreatorOnboarding, type CreatorOnboardingPayload } from '../../../services/v1/web/creator-onboarding.service';

/**
 * POST /web/creator-onboarding – creator onboarding form. Creates influencer records in DB (one per platform+inventory item).
 * No auth required. Same payload as frontend Google Sheet API.
 */
export const creatorOnboardingController = async (req: Request, res: Response) => {
    try {
        const body = (req.body || {}) as CreatorOnboardingPayload;
        const result = await submitCreatorOnboarding(body);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Creator onboarding error (${status}): ${error.message}`);
        return res.status(status).json({ message: error.message });
    }
};
