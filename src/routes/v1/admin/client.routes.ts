import express from 'express';
import {
    listClientsController,
    getClientByIdController,
    createClientController,
    updateClientController,
    deleteClientController,
    uploadClientCsvController,
} from '../../../controllers/v1/admin/client.controller';
import { verifyAdminAuth } from '../../../middleware/auth';
import { uploadCsvMiddleware } from '../../../middleware/uploadCsv';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/', listClientsController);
router.post('/upload-csv', (req, res, next) => {
    uploadCsvMiddleware(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 5MB)' });
            return res.status(400).json({ error: err.message || 'Invalid file' });
        }
        next();
    });
}, uploadClientCsvController);
router.get('/:id', getClientByIdController);
router.post('/', createClientController);
router.patch('/:id', updateClientController);
router.delete('/:id', deleteClientController);

export { router as adminClientRoutes };
