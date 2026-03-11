import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as mediaService from '../../../services/v1/admin/media.service';

export async function listFoldersController(req: Request, res: Response) {
    try {
        const parentId = (req.query.parentId as string) || null;
        const folders = await mediaService.listFolders(parentId === '' ? null : parentId);
        return res.status(HttpStatus.OK).json({ folders });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List folders error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}

export async function createFolderController(req: Request, res: Response) {
    try {
        const name = req.body?.name;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'name is required' });
        }
        const parentId = req.body?.parentId ?? null;
        const folder = await mediaService.createFolder(name.trim(), parentId);
        return res.status(HttpStatus.CREATED).json(folder);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create folder error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}

export async function deleteFolderController(req: Request, res: Response) {
    try {
        await mediaService.deleteFolder(req.params.id);
        return res.status(HttpStatus.OK).json({ message: 'Folder deleted' });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete folder error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}

export async function listFilesController(req: Request, res: Response) {
    try {
        const folderId = (req.query.folderId as string) || null;
        const files = await mediaService.listFiles(folderId === '' ? null : folderId);
        return res.status(HttpStatus.OK).json({ files });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List files error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}

const IMAGE_MIMES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024; // 20MB

/** Single upload: accepts image or document; validates by mimetype and applies 10MB / 20MB limit. */
export async function uploadFileController(req: Request, res: Response) {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'No file. Use field name: file. Images max 10MB, documents max 20MB.' });
        }
        const isImage = IMAGE_MIMES.includes(file.mimetype);
        const type = isImage ? 'image' : 'document';
        const maxBytes = isImage ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
        if (file.size > maxBytes) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                error: isImage ? 'Image too large (max 10MB).' : 'Document too large (max 20MB).',
            });
        }
        const folderId = req.body?.folderId || req.query?.folderId || null;
        const result = await mediaService.uploadFile(
            folderId || null,
            type,
            { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size }
        );
        return res.status(HttpStatus.CREATED).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Upload file error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}

export async function deleteFileController(req: Request, res: Response) {
    try {
        await mediaService.deleteFile(req.params.id);
        return res.status(HttpStatus.OK).json({ message: 'File deleted' });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete file error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
}
