import express from 'express';
import { verifyAdminAuth } from '../../../middleware/auth';
import { uploadMediaMiddleware } from '../../../middleware/uploadMedia';
import {
    listFoldersController,
    createFolderController,
    deleteFolderController,
    listFilesController,
    uploadFileController,
    deleteFileController,
} from '../../../controllers/v1/admin/media.controller';

const router = express.Router();

router.use(verifyAdminAuth);

// Folders
router.get('/folders', listFoldersController);
router.post('/folders', createFolderController);
router.delete('/folders/:id', deleteFolderController);

// Files: single upload route for images (≤10MB) and documents (≤20MB)
router.get('/files', listFilesController);
router.post('/files', (req, res, next) => {
    uploadMediaMiddleware(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (images max 10MB, documents max 20MB)' });
            return res.status(400).json({ error: err.message || 'Invalid file' });
        }
        next();
    });
}, uploadFileController);
router.delete('/files/:id', deleteFileController);

export { router as adminMediaRoutes };
