import express from 'express';
import { searchInfluencerPR, searchPackage } from '../controllers/searchController';

const router = express.Router();

router.get('influencer/fetch', searchInfluencerPR);
router.get('/package/fetch', searchPackage);

export default router;
