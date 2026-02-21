import express from 'express';

import {
    getAllUsersController,
    getUserByIdController,
    createClientController,
    updateUserController,
    downloadClientsController,
} from '../../../controllers/v1/admin/adminClientController';

const router = express.Router();

router.post('/', createClientController);
router.get('/', getAllUsersController);
router.get('/download', downloadClientsController);
router.get('/:id', getUserByIdController);
router.patch('/:id', updateUserController);

export { router as adminClientRoutes };