import express from 'express';
import {
    listKoalInvoicesController,
    getNextKoalInvoiceNumberController,
    getKoalInvoiceByIdController,
    createKoalInvoiceController,
    updateKoalInvoiceController,
    markKoalInvoicePaidController,
    deleteKoalInvoiceController,
    getKoalInvoicePdfController,
} from '../../../controllers/v1/admin/kol-invoice.controller';
import { verifyAdminAuth } from '../../../middleware/auth';

const router = express.Router();

router.use(verifyAdminAuth);

router.get('/', listKoalInvoicesController);
router.get('/next-invoice-number', getNextKoalInvoiceNumberController);
router.get('/:id/pdf', getKoalInvoicePdfController);
router.get('/:id', getKoalInvoiceByIdController);
router.post('/', createKoalInvoiceController);
router.post('/:id/mark-paid', markKoalInvoicePaidController);
router.patch('/:id', updateKoalInvoiceController);
router.delete('/:id', deleteKoalInvoiceController);

export { router as adminKoalInvoiceRoutes };
