import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    getProposalByToken,
    updateProposal,
    updateAndSubmitProposal,
} from '../../../services/v1/admin/proposalTokenService';
import { createProposal } from '../../../services/v1/admin/adminProposalService';
import { fetchInvoiceDetails } from '../../../services/v1/payment/invoiceService';
// Get the cart to find user
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { InfluencerCartItem } from '../../../entity/cart/InfluencerCartItem.entity';
import { BillingDetails } from '../../../entity/billingDetails';
import { Checkout } from '../../../entity/checkout';
import { ProposalToken } from '../../../entity/proposalToken/ProposalToken.entity';

/**
 * Get proposal details by token (for client to view)
 */
export const getProposalByTokenController = async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
        const proposalData = await getProposalByToken(token);
        return res.status(HttpStatus.OK).json(proposalData);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching proposal details';

        logger.error(`Error fetching proposal by token (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

/**
 * Update proposal (accept/deny influencer items, update billing info) without submitting
 */
export const updateProposalController = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { billingInfo, influencerItems } = req.body;

    try {
        // Map influencerItems to the format expected by the service
        const influencerItemUpdates = (influencerItems || []).map((item: any) => ({
            id: item.id,
            isClientApproved: item.isClientApproved,
        }));

        // Update proposal - this will mark token as used (isUsed = true)
        const proposalToken = await updateProposal(
            token,
            billingInfo || {},
            influencerItemUpdates,
        );

        // Return success response indicating token is now marked as used
        return res.status(HttpStatus.OK).json({
            message: 'Proposal updated successfully',
            isUsed: true,
            cartId: proposalToken.cart?.id,
            billingInfo: proposalToken.billingInfo ? JSON.parse(proposalToken.billingInfo) : null,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while updating proposal';

        logger.error(`Error updating proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

/**
 * Update proposal (accept/deny influencer items, update billing info) and submit
 */
export const updateAndSubmitProposalController = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { billingInfo, influencerItems } = req.body;

    // Map influencerItems to the format expected by the service
    const influencerItemUpdates = (influencerItems || []).map((item: any) => ({
        id: item.id,
        isClientApproved: item.isClientApproved,
    }));

    try {
        // First, update the proposal and mark token as used
        const { cartId, billingInfo: updatedBillingInfo } = await updateAndSubmitProposal(
            token,
            billingInfo,
            influencerItemUpdates,
        );

        const cartRepository = AppDataSource.getRepository(Cart);
        const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);

        const cart = await cartRepository.findOne({
            where: { id: cartId },
            relations: ['user', 'influencerCartItems'],
        });

        if (!cart || !cart.user) {
            throw new Error('Cart or user not found');
        }

        // Update approval status for all influencer items (don't remove any)
        for (const update of influencerItemUpdates) {
            const cartItem = cart.influencerCartItems.find((item) => item.id === update.id);
            if (cartItem) {
                cartItem.isClientApproved = update.isClientApproved;
                await influencerCartItemRepository.save(cartItem);
            }
        }

        logger.info(`Updated approval status for ${influencerItemUpdates.length} influencer items`);

        // Re-fetch cart to get updated items
        const updatedCart = await cartRepository.findOne({
            where: { id: cartId },
            relations: ['influencerCartItems'],
        });

        if (!updatedCart) {
            throw new Error('Cart not found after update');
        }

        // Calculate total amount from approved items only (but keep all items in cart)
        const approvedItems = updatedCart.influencerCartItems.filter((item) => item.isClientApproved);
        const totalAmount = approvedItems.reduce((sum, item) => sum + Number(item.price), 0);

        // Update existing checkout and billing details (they were created during token creation)
        const checkoutRepository = AppDataSource.getRepository(Checkout);
        const billingDetailsRepository = AppDataSource.getRepository(BillingDetails);

        // Find existing checkout (must exist since it was created in createProposalToken)
        const checkout = await checkoutRepository.findOne({
            where: { cart: { id: cart.id } },
        });

        if (!checkout) {
            throw new Error('Checkout not found. Proposal may not have been created properly.');
        }

        // Update checkout total amount
        checkout.totalAmount = totalAmount;
        await checkoutRepository.save(checkout);
        logger.info(`Updated checkout: ${checkout.id} with total: ${totalAmount}`);

        // Find existing billing details (must exist since it was created in createProposalToken)
        const billingDetails = await billingDetailsRepository.findOne({
            where: { checkout: { id: checkout.id } },
        });

        if (!billingDetails) {
            throw new Error('BillingDetails not found. Proposal may not have been created properly.');
        }

        // Update billing details with new information from client
        billingDetails.firstName = updatedBillingInfo.firstName || billingDetails.firstName || '';
        billingDetails.lastName = updatedBillingInfo.lastName || billingDetails.lastName || '';
        billingDetails.projectName = updatedBillingInfo.projectName || billingDetails.projectName || '';
        billingDetails.telegramId = updatedBillingInfo.telegramId ?? billingDetails.telegramId;
        billingDetails.projectUrl = updatedBillingInfo.projectUrl ?? billingDetails.projectUrl;
        billingDetails.campaignLiveDate = updatedBillingInfo.campaignLiveDate ?? billingDetails.campaignLiveDate;
        billingDetails.note = updatedBillingInfo.note ?? billingDetails.note;
        billingDetails.managementFeePercentage = updatedBillingInfo.managementFeePercentage ?? billingDetails.managementFeePercentage ?? 0;
        billingDetails.proposalStatus = 'sent';
        billingDetails.invoiceStatus = 'Not Paid';
        billingDetails.paymentStatus = 'Unpaid';
        billingDetails.totalAmount = totalAmount;
        await billingDetailsRepository.save(billingDetails);
        logger.info(`Updated billing details: ${billingDetails.id}`);
        logger.info(`Total approved items: ${approvedItems.length}, Total unapproved items: ${updatedCart.influencerCartItems.length - approvedItems.length}`);

        const checkoutDetails = {
            firstName: billingDetails.firstName,
            lastName: billingDetails.lastName,
            projectName: billingDetails.projectName,
            telegramId: billingDetails.telegramId,
            projectUrl: billingDetails.projectUrl,
            email: cart.user.email,
            campaignLiveDate: billingDetails.campaignLiveDate,
        };

        const finalCartId = cart.id;
        const finalTotalAmount = totalAmount;
        const email = cart.user.email;

        // Send response immediately
        res.status(HttpStatus.OK).json({
            message: 'Proposal submitted successfully',
            checkoutId: checkout.id,
            checkoutDetails,
            cartId: finalCartId,
            billingDetailsId: billingDetails.id,
            totalAmount: finalTotalAmount,
            email,
        });

        // Process invoice in the background
        // fetchInvoiceDetails(
        //     finalCartId,
        //     email,
        //     updatedBillingInfo.managementFeePercentage ?? 0,
        //     finalTotalAmount,
        //     updatedBillingInfo.discount ?? 5,
        //     checkoutDetails,
        // )
        //     .then(() => logger.info(`Invoice processing initiated for cartId: ${finalCartId}`))
        //     .catch((error) =>
        //         logger.error(`Error processing invoice for cartId: ${finalCartId}: ${error}`),
        //     );
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while updating and submitting proposal';

        logger.error(`Error updating and submitting proposal (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

