import express from 'express';

import {
    createProposalPrController,
    getProposalPrDetailsController,
    editProposalPrController,
    generateInvoicePdfPrController,
    sendInvoiceEmailPrController,
    deleteProposalPrController,
    downloadProposalPrController,
} from '../../../controllers/v1/admin/adminProposalPrController';

const router = express.Router();

// create proposal-pr route
router.post('/', createProposalPrController);

// get proposal-pr by id route
router.get('/', getProposalPrDetailsController);

// update proposal-pr route
router.put('/', editProposalPrController);

router.post('/pdf', downloadProposalPrController);

// delete proposal-pr route
router.delete('/:checkoutPrId', deleteProposalPrController);

// generate invoice pdf route
router.post('/generate-invoice-pdf', generateInvoicePdfPrController);

// Send invoice pdf
router.post('/invoices/send', sendInvoiceEmailPrController);

export { router as adminProposalPrRoutes };

