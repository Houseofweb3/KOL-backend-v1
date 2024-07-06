import { Router } from 'express';
import { getInvoiceDetails } from '../controllers/invoiceController';

const router = Router();

// Define the route for fetching invoice details
router.get('/fetch', getInvoiceDetails);

export default router;
