import { Router } from 'express';
import { generateInvoiceController } from '../../../controllers/v1/payment';

const router = Router();

router.post('/generate', generateInvoiceController);

export default router;
