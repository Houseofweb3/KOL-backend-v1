import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    listClients,
    listClientsForSelect,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
} from '../../../services/v1/admin/client.service';
import { uploadClientsFromCsv } from '../../../services/v1/admin/client-csv.service';

export const listClientsController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const categories = typeof req.query.categories === 'string' ? req.query.categories : undefined;
        const includeDeleted = req.query.includeDeleted === 'true';
        const result = await listClients({ page, limit, search, categories, includeDeleted });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List clients error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** GET /admin/client/select - list clients for dropdown (id, name, email only). Pagination + search by name or email. */
export const listClientsForSelectController = async (req: Request, res: Response) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const result = await listClientsForSelect({ page, limit, search });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List clients for select error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const getClientByIdController = async (req: Request, res: Response) => {
    try {
        const client = await getClientById(req.params.id);
        return res.status(HttpStatus.OK).json(client);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get client error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

const CLIENT_CREATE_KEYS = [
    'name', 'email', 'website', 'telegramId', 'whatsAppNumber', 'categories', 'campaignGoals',
    'monetizationModel', 'primaryAudienceGeography', 'ageRange', 'genderSkew',
    'campaignStartTimeline', 'customBrief',
] as const;

const CLIENT_UPDATE_KEYS = [
    'name', 'email', 'website', 'telegramId', 'whatsAppNumber', 'categories', 'campaignGoals',
    'monetizationModel', 'primaryAudienceGeography', 'ageRange', 'genderSkew',
    'campaignStartTimeline', 'customBrief',
] as const;

export const createClientController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const name = body.name;
        const email = body.email;
        if (!name || !email) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'name and email are required' });
        }
        const data: Record<string, unknown> = { name, email };
        for (const key of CLIENT_CREATE_KEYS) {
            if (key !== 'name' && key !== 'email' && key in body) data[key] = body[key];
        }
        if ('billingInfo' in body) data.billingInfo = body.billingInfo;
        const client = await createClient(data as Parameters<typeof createClient>[0]);
        return res.status(HttpStatus.CREATED).json(client);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create client error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const updateClientController = async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const data: Record<string, unknown> = {};
        for (const key of CLIENT_UPDATE_KEYS) {
            if (key in body) data[key] = body[key];
        }
        if ('billingInfo' in body) data.billingInfo = body.billingInfo;
        const client = await updateClient(req.params.id, data as Parameters<typeof updateClient>[1]);
        return res.status(HttpStatus.OK).json(client);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update client error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const deleteClientController = async (req: Request, res: Response) => {
    try {
        await deleteClient(req.params.id);
        return res.status(HttpStatus.OK).json({ message: 'Client deleted' });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete client error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

/** POST /upload-csv - upload CSV file (Ampli5 brand-intake-form). Field name: file */
export const uploadClientCsvController = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'No file uploaded. Use field name: file' });
        }
        const result = await uploadClientsFromCsv(file.buffer);
        return res.status(HttpStatus.OK).json({
            message: 'CSV processed',
            created: result.created,
            skipped: result.skipped,
            errors: result.errors,
        });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Upload client CSV error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};
