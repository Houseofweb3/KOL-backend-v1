import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import type { JwtRequest } from '../../../middleware/auth';
import {
    listBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    deleteBlog,
} from '../../../services/v1/web/blog.service';

export const listBlogsController = async (_req: Request, res: Response) => {
    try {
        const blogs = await listBlogs();
        return res.status(HttpStatus.OK).json({ blogs });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`List blogs error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const getBlogBySlugController = async (req: Request, res: Response) => {
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
        logger.error(`Get blog by slug error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const createBlogController = async (req: Request, res: Response) => {
    const u = (req as JwtRequest).webUserEntity;
    if (!u) {
        return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: 'User context is missing. Is auth middleware applied?' });
    }
    const defaultAuthor = u.email;
    try {
        const blog = await createBlog(req.body || {}, defaultAuthor);
        return res.status(HttpStatus.CREATED).json({ blog });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create blog error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const updateBlogController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const blog = await updateBlog(String(id || ''), req.body || {});
        return res.status(HttpStatus.OK).json({ blog });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update blog error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};

export const deleteBlogController = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await deleteBlog(String(id || ''));
        return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const status =
            error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete blog error (${status}): ${msg}`);
        return res.status(status).json({ error: msg });
    }
};
