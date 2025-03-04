import express from 'express';

import {
    createProposalController, getProposalDetailsController, editProposalController, generateInvoicePdfController, sendInvoiceEmailController
} from '../../../controllers/v1/admin/adminProposalController';

const router = express.Router();

// get all users route
router.post('/', createProposalController);

// get user by id route
router.get('/', getProposalDetailsController);

// update user route
router.put('/', editProposalController);

// generate invoice pdf route
router.get('/generate-invoice-pdf', generateInvoicePdfController);

// Send invoice pdf
router.post('/invoices/send', sendInvoiceEmailController);



export { router as adminProposalRoutes };