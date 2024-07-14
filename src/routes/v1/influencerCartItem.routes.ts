import { Router } from 'express';
import { createInfluencerCartItemHandler, deleteInfluencerCartItemHandler, getInfluencerCartItemsHandler } from '../../controllers/v1/influencerCartItemController';

const router = Router();

router.post('/', createInfluencerCartItemHandler);
router.delete('/:id', deleteInfluencerCartItemHandler);
router.get('/', getInfluencerCartItemsHandler);

export default router;
