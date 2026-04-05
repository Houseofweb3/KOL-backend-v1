import express from 'express';
import {
    getProposalBySlugPathController,
    getProposalByTokenController,
    submitProposalBySlugPathController,
    submitProposalController,
} from '../../../controllers/v1/web/proposal.controller';

const router = express.Router();

/** No auth: readable path (slug + date + cart id). Register before /:token */
router.get('/slug/:clientSlug/:date/:cartId', getProposalBySlugPathController);
router.post('/slug/:clientSlug/:date/:cartId/submit', submitProposalBySlugPathController);

/** Legacy: token only in path */
router.get('/:token', getProposalByTokenController);
router.post('/:token/submit', submitProposalController);

export const webProposalRoutes = router;
