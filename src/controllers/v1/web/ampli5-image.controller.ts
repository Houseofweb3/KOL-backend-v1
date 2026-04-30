import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { deleteAmpli5ImageByKeyOrUrl, listAmpli5Images, uploadAmpli5Image } from '../../../services/v1/web/ampli5-image.service';

export const uploadAmpli5ImageController = async (req: Request, res: Response) => {
    const file = req.file;
    const folderName = typeof req.body?.folderName === 'string' ? req.body.folderName : '';

    if (!file?.buffer) {
        return res
            .status(HttpStatus.BAD_REQUEST)
            .json({ error: 'No file. Use multipart field name: file. Images only, max 10MB.' });
    }
    if (!folderName?.trim()) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing "folderName" (multipart field or form field).' });
    }

    try {
        const { url } = await uploadAmpli5Image({
            folderName,
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        });
        return res.status(HttpStatus.CREATED).json({ url });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Upload failed';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Ampli5 image upload (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const deleteAmpli5ImageController = async (req: Request, res: Response) => {
    const key = typeof req.body?.key === 'string' ? req.body.key : '';
    const url = typeof req.body?.url === 'string' ? req.body.url : '';

    if (!key?.trim() && !url?.trim()) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Body must include non-empty "key" or "url".' });
    }

    try {
        const result = await deleteAmpli5ImageByKeyOrUrl({ key, url });
        return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Delete failed';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Ampli5 image delete (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const listAmpli5ImagesController = async (req: Request, res: Response) => {
    const folderName = typeof req.query?.folderName === 'string' ? req.query.folderName : '';
    const limit =
        typeof req.query?.limit === 'string' && req.query.limit.trim()
            ? Number.parseInt(req.query.limit, 10)
            : undefined;

    if (!folderName?.trim()) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Query must include non-empty "folderName".' });
    }

    try {
        const { urls } = await listAmpli5Images({ folderName, limit });
        return res.status(HttpStatus.OK).json({ urls });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'List failed';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Ampli5 image list (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

