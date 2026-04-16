import express from 'express';
import { uploadImageMiddleware } from '../../../middleware/uploadMedia';
import {
    uploadBlogPublicImageController,
    deleteBlogPublicImageController,
} from '../../../controllers/v1/web/blog-public-image.controller';

const router = express.Router();

/** Open routes: no JWT. For blog editor / cover URLs. */
router.post(
    '/upload',
    (req, res, next) => {
        uploadImageMiddleware(req, res, (err: unknown) => {
            if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large (images max 10MB)' });
            }
            if (err instanceof Error) {
                return res.status(400).json({ error: err.message || 'Invalid file' });
            }
            next();
        });
    },
    uploadBlogPublicImageController
);

router.delete('/', deleteBlogPublicImageController);

export { router as webBlogPublicImageRoutes };
