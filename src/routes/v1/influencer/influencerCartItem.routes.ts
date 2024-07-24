import { Router } from 'express';
import {
    createInfluencerCartItemHandler,
    deleteInfluencerCartItemHandler,
    getInfluencerCartItemsHandler
} from '../../../controllers/v1/influencer';

const router = Router();

router.post('/', createInfluencerCartItemHandler);
router.delete('/:id', deleteInfluencerCartItemHandler);
router.get('/', getInfluencerCartItemsHandler);

export { router as influencerCartItemRoutes };
