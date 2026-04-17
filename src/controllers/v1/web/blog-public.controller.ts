import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getBlogBySlug, listPublicBlogs } from '../../../services/v1/web/blog.service';

export const listPublicBlogsController = async (_req: Request, res: Response) => {
    try {
        const blogs = await listPublicBlogs();
        return res.status(HttpStatus.OK).json({ blogs });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List public blogs error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const getPublicBlogBySlugController = async (req: Request, res: Response) => {
    const raw = req.params.slug ?? '';
    const slug = decodeURIComponent(raw);
    try {
        const blog = await getBlogBySlug(slug);
        return res.status(HttpStatus.OK).json({ blog });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get public blog by slug error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};
