import express from 'express';
import { uploadImageMiddleware } from '../../../middleware/uploadMedia';
import {
    deleteAmpli5ImageController,
    listAmpli5ImagesController,
    uploadAmpli5ImageController,
} from '../../../controllers/v1/web/ampli5-image.controller';

const router = express.Router();

/** Open routes: no JWT. Used by ampli5.ai onboarding to upload audience demographic images. */
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
    uploadAmpli5ImageController
);

/** List images in a folder for admin panel browsing. */
router.get('/', listAmpli5ImagesController);

/** Delete by key or url (must be under media/ampli5/). */
router.delete('/', deleteAmpli5ImageController);

export { router as webAmpli5ImageRoutes };

