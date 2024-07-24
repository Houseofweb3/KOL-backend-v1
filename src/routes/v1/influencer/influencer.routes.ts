import express from 'express';
import multer from 'multer';
import { uploadCSVHandler, getInfluencersWithHiddenPricesHandler, createInfluencerHandler, deleteInfluencerHandler,
    getFilterOptionsController
 } from '../../../controllers/v1/influencer/influencerController';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/upload', upload.single('file'), uploadCSVHandler);
router.get('/fetch', getInfluencersWithHiddenPricesHandler)
router.get('/filter-options', getFilterOptionsController)
router.post('/', createInfluencerHandler)
router.delete('/:id', deleteInfluencerHandler)

export { router as influencerRoutes };
