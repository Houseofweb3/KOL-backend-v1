import express from 'express';
import multer from 'multer';
import { uploadCSVHandler, getInfluencersWithHiddenPricesHandler, createInfluencerHandler, deleteInfluencerHandler } from '../../controllers/v1/influencerController';

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/upload', upload.single('file'), uploadCSVHandler);
router.get('/fetch', getInfluencersWithHiddenPricesHandler)
router.post('/', createInfluencerHandler)
router.delete('/:id', deleteInfluencerHandler)

export default router;
