import express from 'express';
import multer from 'multer';
import { uploadCSVHandler, uploadNewFormatCSVHandler, getInfluencersWithHiddenPricesHandler, createInfluencerHandler, deleteInfluencerHandler,
    deleteNewInfluencersHandler, getFilterOptionsController
 } from '../../../controllers/v1/influencer/influencerController';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/upload', upload.single('file'), uploadCSVHandler);
router.post('/upload-new-format', upload.single('file'), uploadNewFormatCSVHandler);
router.post('/delete-new-influencers', deleteNewInfluencersHandler);
router.get('/fetch', getInfluencersWithHiddenPricesHandler)
router.get('/filter-options', getFilterOptionsController)
router.post('/', createInfluencerHandler)
router.delete('/:id', deleteInfluencerHandler)

export { router as influencerRoutes };
