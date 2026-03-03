import express from 'express';
import { webListInfluencersController } from '../../../controllers/v1/web/influencer.controller';

const router = express.Router();

// Protected web influencer list: requires valid client JWT
router.get('/', webListInfluencersController);

export { router as webInfluencerRoutes };
