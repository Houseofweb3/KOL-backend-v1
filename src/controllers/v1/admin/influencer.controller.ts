import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    listInfluencers,
    getInfluencerById,
    createInfluencer,
    updateInfluencer,
    deleteInfluencer,
    deleteAllInfluencers,
    type CreateInfluencerData,
    type UpdateInfluencerData,
} from '../../../services/v1/admin/influencer.service';
import { uploadInfluencersFromCsv } from '../../../services/v1/admin/influencer-csv.service';

const INFLUENCER_CREATE_KEYS = [
    'name', 'email', 'telegramId', 'whatsAppNumber', 'primaryCountry', 'primaryTimezone',
    'platform', 'platformLink', 'inventory', 'buyPrice', 'sellPrice', 'cpm', 'avgViews',
    'industries', 'categories', 'primaryAudienceGeography', 'secondaryAudienceGeography',
    'ageScreenshotUrl', 'genderScreenshotUrl', 'topCountriesScreenshotUrl', 'paymentTerms', 'turnaroundTimes',
    'firstCollaborationImage1', 'firstCollaborationImage2', 'firstCollaborationImage3',
    'xLink', 'instagramLink', 'youtubeLink', 'tiktokLink', 'newsletterLink', 'finalConfirmation', 'isVerified',
] as const;

const INFLUENCER_UPDATE_KEYS = INFLUENCER_CREATE_KEYS;

/** Parse query param as one or more values: "a,b" or ["a","b"] → ["a","b"] */
function parseQueryArray(value: unknown): string[] {
    if (value == null) return [];
    const arr = Array.isArray(value) ? value : [value];
    return arr
        .flatMap((v) => String(v).split(',').map((s) => s.trim()))
        .filter(Boolean);
}

export const listInfluencersController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const industries = parseQueryArray(req.query.industries);
        const categories = parseQueryArray(req.query.categories);
        const platform = parseQueryArray(req.query.platform);
        const primaryCountry = parseQueryArray(req.query.primaryCountry);
        const inventory = parseQueryArray(req.query.inventory);
        const primaryAudienceGeography = parseQueryArray(req.query.primaryAudienceGeography);
        const includeDeleted = req.query.includeDeleted === 'true';
        const result = await listInfluencers({
            page,
            limit,
            search,
            industries,
            categories,
            platform,
            primaryCountry,
            inventory,
            primaryAudienceGeography,
            includeDeleted,
        });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List influencers error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const getInfluencerByIdController = async (req: Request, res: Response) => {
    try {
        const influencer = await getInfluencerById(req.params.id);
        return res.status(HttpStatus.OK).json(influencer);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get influencer error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const createInfluencerController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const name = body.name;
        const email = body.email;
        if (!name || !email) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'name and email are required' });
        }
        const data: Record<string, unknown> = { name, email };
        for (const key of INFLUENCER_CREATE_KEYS) {
            if (key !== 'name' && key !== 'email' && key in body) data[key] = body[key];
        }
        const influencer = await createInfluencer(data as CreateInfluencerData);
        return res.status(HttpStatus.CREATED).json(influencer);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create influencer error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const updateInfluencerController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const data: Record<string, unknown> = {};
        for (const key of INFLUENCER_UPDATE_KEYS) {
            if (key in body) data[key] = body[key];
        }
        const influencer = await updateInfluencer(req.params.id, data as UpdateInfluencerData);
        return res.status(HttpStatus.OK).json(influencer);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update influencer error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const deleteInfluencerController = async (req: Request, res: Response) => {
    try {
        await deleteInfluencer(req.params.id);
        return res.status(HttpStatus.OK).json({ message: 'Influencer deleted' });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete influencer error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** DELETE /all - hard-delete all influencers (remove from DB). */
export const deleteAllInfluencersController = async (req: Request, res: Response) => {
    try {
        const { deleted } = await deleteAllInfluencers();
        return res.status(HttpStatus.OK).json({ message: 'All influencers removed from DB', deleted });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete all influencers error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** POST /upload-csv - upload CSV (influencer intake). Field name: file */
export const uploadInfluencerCsvController = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'No file uploaded. Use field name: file' });
        }
        const result = await uploadInfluencersFromCsv(file.buffer);
        return res.status(HttpStatus.OK).json({
            message: 'CSV processed',
            created: result.created,
            errors: result.errors,
        });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Upload influencer CSV error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
