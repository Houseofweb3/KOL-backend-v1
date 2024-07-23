import express from 'express';
import {
    healthCheck
} from '../../../controllers/v1/utils/healthController';

const router = express.Router();

router.get('/healthCheck', healthCheck);

export { router as utilsRoutes };
