import express from 'express';

import {
    createProposalController,
    getProposalDetailsController,
    editProposalController,
    generateInvoicePdfController,
    sendInvoiceEmailController,
    deleteProposalController,
    downloadProposalController,
    updateSentProposalController,
} from '../../../controllers/v1/admin/adminProposalController';

const router = express.Router();

// get all users route
router.post('/', createProposalController);

// get user by id route
router.get('/', getProposalDetailsController);

// update user route
router.put('/', editProposalController);

// update sent proposal route
router.put('/send', updateSentProposalController);

router.post('/pdf', downloadProposalController);

// delete proposal route

router.delete('/:checkoutId', deleteProposalController);

// generate invoice pdf route
router.post('/generate-invoice-pdf', generateInvoicePdfController);

// Send invoice pdf
router.post('/invoices/send', sendInvoiceEmailController);

export { router as adminProposalRoutes };
