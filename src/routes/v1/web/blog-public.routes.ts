import express from 'express';
import { getPublicBlogBySlugController, listPublicBlogsController } from '../../../controllers/v1/web/blog-public.controller';

const router = express.Router();

/** Open read-only blog APIs (no JWT). */
router.get('/', listPublicBlogsController);
router.get('/slug/:slug', getPublicBlogBySlugController);

export { router as webBlogPublicRoutes };
