import express from 'express';

import {
    getAllUsersController, getUserByIdController, updateUserController
} from '../../../controllers/v1/admin/adminClientController';

const router = express.Router();

// get all users route
router.get('/', getAllUsersController);

// get user by id route
router.get('/:id', getUserByIdController);

// update user route
router.patch('/:id', updateUserController);

export { router as adminClientRoutes };