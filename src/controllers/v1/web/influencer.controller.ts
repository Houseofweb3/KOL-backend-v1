import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { webListInfluencers } from '../../../services/v1/web/influencer.service';

/** Parse query param as one or more values: "a,b" or ["a","b"] → ["a","b"] */
function parseQueryArray(value: unknown): string[] {
    if (value == null) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .flatMap((v) => String(v).split(',').map((s) => s.trim()))
        .filter(Boolean);
}

/**
 * GET /api/v1/web/influencer - list influencers (no auth).
 * Query: page, limit, search, primaryCountry, platform, inventory, industries, categories, primaryAudienceGeography.
 * Each filter accepts one or more values: ?platform=X&platform=YouTube or ?categories=Tech,Crypto
 */
export const webListInfluencersController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const primaryCountry = parseQueryArray(req.query.primaryCountry);
        const platform = parseQueryArray(req.query.platform);
        const inventory = parseQueryArray(req.query.inventory);
        const industries = parseQueryArray(req.query.industries);
        const categories = parseQueryArray(req.query.categories);
        const primaryAudienceGeography = parseQueryArray(req.query.primaryAudienceGeography);

        const result = await webListInfluencers({
            page,
            limit,
            search,
            primaryCountry,
            platform,
            inventory,
            industries,
            categories,
            primaryAudienceGeography,
        });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Web list influencers error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
