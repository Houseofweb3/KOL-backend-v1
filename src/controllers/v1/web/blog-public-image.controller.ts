import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { deleteBlogPublicImageByUrl, uploadBlogPublicImage } from '../../../services/v1/web/blog-public-image.service';

export const uploadBlogPublicImageController = async (req: Request, res: Response) => {
    const file = req.file;
    if (!file?.buffer) {
        return res
            .status(HttpStatus.BAD_REQUEST)
            .json({ error: 'No file. Use multipart field name: file. Images only, max 10MB.' });
    }
    try {
        const { url } = await uploadBlogPublicImage({
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
        logger.error(`Blog public image upload (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const deleteBlogPublicImageController = async (req: Request, res: Response) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Body must include non-empty "url" (the image URL returned from upload).' });
    }
    try {
        const result = await deleteBlogPublicImageByUrl(url);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Delete failed';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Blog public image delete (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};
