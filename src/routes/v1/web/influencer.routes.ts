import express from 'express';
import { webListInfluencersController } from '../../../controllers/v1/web/influencer.controller';
import { verifyClientAuth } from '../../../middleware/auth';

const router = express.Router();

// Protected web influencer list: requires valid client JWT
router.get('/', verifyClientAuth, webListInfluencersController);

export { router as webInfluencerRoutes };
