import { Router } from 'express';
import { generateInvoiceController } from '../../controllers/v1/invoiceController';

const router = Router();

// generate an invoice
router.post('/generate', generateInvoiceController);

export default router;
