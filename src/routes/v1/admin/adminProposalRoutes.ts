import express from 'express';

import {
    createProposalController, getProposalDetailsController, editProposalController
} from '../../../controllers/v1/admin/adminProposalController';

const router = express.Router();

// get all users route
router.post('/', createProposalController);

// get user by id route
router.get('/', getProposalDetailsController);

// update user route
router.put('/', editProposalController);


export { router as adminProposalRoutes };