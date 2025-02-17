import express from 'express';
import {
    getAllInfluencersController,
    createInfluencerController,
    updateInfluencerController,
    deleteInfluencerController,
    getInfluencerByIdController
} from '../../../controllers/v1/admin/adminInfluencerController';

const router = express.Router();

// get all influencers route
router.get('/', getAllInfluencersController);

// get influencer by id route
router.get('/:id', getInfluencerByIdController);

// create influencer route
router.post('/', createInfluencerController);

// update influencer route
router.patch('/:id', updateInfluencerController);

// delete influencer route
router.delete('/:id', deleteInfluencerController);

export { router as adminInfluencerRoutes };

