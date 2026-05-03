import express from 'express';

import {
    createTaskController,
    deleteTaskController,
    getTaskByIdController,
    getTasksBoardAssignedController,
    getTasksBoardCreatedController,
    updateTaskContentController,
    updateTaskStatusController,
} from '../../../controllers/v1/admin/task.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/board/created', getTasksBoardCreatedController);
router.get('/board/assigned', getTasksBoardAssignedController);
router.post('/', createTaskController);
router.get('/:id', getTaskByIdController);
router.patch('/:id/status', updateTaskStatusController);
router.patch('/:id', updateTaskContentController);
router.delete('/:id', deleteTaskController);

export { router as adminTaskRoutes };
