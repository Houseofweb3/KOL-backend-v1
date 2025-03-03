import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { createProposal, getProposalDetails, editProposal } from '../../../services/v1/admin';
import { fetchInvoiceDetails } from '../../../services/v1/payment';


// create proposal
export const createProposalController = async (req: Request, res: Response) => {
    const { userId, billingInfo, influencerItems } = req.body;
    try {
        const {
            message,
            checkoutId,
            checkoutDetails,
            cartId,
            billingDetailsId,
            totalAmount,
            email
        } = await createProposal(userId, billingInfo, influencerItems);

        // ✅ Send response immediately (DO NOT wait for invoice processing)
        res.status(HttpStatus.CREATED).json({
            message,
            checkoutId,
            checkoutDetails,
            cartId,
            billingDetailsId,
            totalAmount,
            email,
        });

        // ✅ Process invoice in the background (no `await`, non-blocking)
        fetchInvoiceDetails(cartId, email, billingInfo.managementFeePercentage ?? 0, totalAmount, billingInfo.discount ?? 5, checkoutDetails)
            .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
            .catch(error => logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`));

    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while creating proposal';

        logger.error(`Error while creating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// get proposal details
export const getProposalDetailsController = async (req: Request, res: Response) => {
    const { checkoutId } = req.query;
    try {
        const proposalDetails = await getProposalDetails(checkoutId as string);
        return res.status(HttpStatus.OK).json(proposalDetails);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while fetching proposal details';

        logger.error(`Error while fetching proposal details (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// edit proposal
export const editProposalController = async (req: Request, res: Response) => {
    const { checkoutId, billingInfo, influencerItems } = req.body;
    try {

        const { message, checkoutDetails, cartId, email, calculatedTotalAmount } = await editProposal(checkoutId, billingInfo, influencerItems);
        // ✅ Process invoice in the background (no `await`, non-blocking)
        if (cartId && email && billingInfo?.proposalStatus === 'sent') {
            fetchInvoiceDetails(cartId, email, billingInfo.managementFeePercentage ?? 0, calculatedTotalAmount, billingInfo.discount ?? 5, checkoutDetails)
                .then(() => logger.info(`Invoice processing initiated for cartId: ${cartId}`))
                .catch(error => logger.error(`Error processing invoice for cartId: ${cartId}: ${error}`));

            // send response immediately to proposal re-sent
            res.status(HttpStatus.OK).json({
                message: 'Proposal updated and invoice processing initiated',
                checkoutDetails,
            });

        } else {
            res.status(HttpStatus.OK).json({
                message,
                checkoutDetails,
            })
        }

    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred while updating proposal';

        logger.error(`Error while updating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};


