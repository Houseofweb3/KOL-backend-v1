import express from 'express';
import {
    listInfluencersController,
    listInfluencersForSelectController,
    getInfluencerByIdController,
    createInfluencerController,
    updateInfluencerController,
    deleteInfluencerController,
    deleteAllInfluencersController,
    uploadInfluencerCsvController,
} from '../../../controllers/v1/admin/influencer.controller';
import { verifyAdminAuth } from '../../../middleware/auth';
import { uploadCsvMiddleware } from '../../../middleware/uploadCsv';

const router = express.Router();

// router.use(verifyAdminAuth);

router.get('/', listInfluencersController);
router.get('/select', listInfluencersForSelectController);
router.post('/upload-csv', (req, res, next) => {
    uploadCsvMiddleware(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 5MB)' });
            return res.status(400).json({ error: err.message || 'Invalid file' });
        }
        next();
    });
}, uploadInfluencerCsvController);
router.get('/:id', getInfluencerByIdController);
router.post('/', createInfluencerController);
router.patch('/:id', updateInfluencerController);
router.delete('/all', deleteAllInfluencersController);
router.delete('/:id', deleteInfluencerController);

export { router as adminInfluencerRoutes };
