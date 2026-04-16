import express from 'express';
import { verifyWebUserAuth } from '../../../middleware/auth';
import {
    listBlogsController,
    getBlogBySlugController,
    createBlogController,
    updateBlogController,
    deleteBlogController,
} from '../../../controllers/v1/web/blog.controller';

const router = express.Router();

router.use(verifyWebUserAuth);

router.get('/', listBlogsController);
router.get('/slug/:slug', getBlogBySlugController);
router.post('/', createBlogController);
router.patch('/:id', updateBlogController);
router.delete('/:id', deleteBlogController);

export { router as webBlogRoutes };
