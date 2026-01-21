import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    getProposalPrByToken,
    updateProposalPr,
    updateAndSubmitProposalPr,
} from '../../../services/v1/admin/proposalPrTokenService';
import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { DrCartItem } from '../../../entity/cart/DrCartItem.entity';
import { BillingDetailsPr } from '../../../entity/billingDetailsPr';
import { CheckoutPr } from '../../../entity/checkoutPr';
import { ProposalPrToken } from '../../../entity/proposalToken/ProposalPrToken.entity';

/**
 * Get proposal-pr details by token (for client to view)
 */
export const getProposalPrByTokenController = async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
        const proposalData = await getProposalPrByToken(token);
        return res.status(HttpStatus.OK).json(proposalData);
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while fetching proposal-pr details';

        logger.error(`Error fetching proposal-pr by token (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

/**
 * Update proposal-pr (accept/deny DR items, update billing info) without submitting
 */
export const updateProposalPrController = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { billingInfo, drItems } = req.body;

    try {
        // Map drItems to the format expected by the service
        const drItemUpdates = (drItems || []).map((item: any) => ({
            id: item.id,
            isClientApproved: item.isClientApproved,
        }));

        // Update proposal-pr - this will mark token as used (isUsed = true)
        const proposalPrToken = await updateProposalPr(
            token,
            billingInfo || {},
            drItemUpdates,
        );

        // Return success response indicating token is now marked as used
        return res.status(HttpStatus.OK).json({
            message: 'Proposal-pr updated successfully',
            isUsed: true,
            cartId: proposalPrToken.cart?.id,
            billingInfo: proposalPrToken.billingInfo ? JSON.parse(proposalPrToken.billingInfo) : null,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while updating proposal-pr';

        logger.error(`Error updating proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

/**
 * Update proposal-pr (accept/deny DR items, update billing info) and submit
 */
export const updateAndSubmitProposalPrController = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { billingInfo, drItems } = req.body;

    // Map drItems to the format expected by the service
    const drItemUpdates = (drItems || []).map((item: any) => ({
        id: item.id,
        isClientApproved: item.isClientApproved,
    }));

    try {
        // First, update the proposal-pr and mark token as used
        const { cartId, billingInfo: updatedBillingInfo } = await updateAndSubmitProposalPr(
            token,
            billingInfo,
            drItemUpdates,
        );

        const cartRepository = AppDataSource.getRepository(Cart);
        const drCartItemRepository = AppDataSource.getRepository(DrCartItem);

        const cart = await cartRepository.findOne({
            where: { id: cartId },
            relations: ['user', 'drCartItems'],
        });

        if (!cart || !cart.user) {
            throw new Error('Cart or user not found');
        }

        // Update approval status for all DR items (don't remove any)
        for (const update of drItemUpdates) {
            const cartItem = cart.drCartItems.find((item) => item.id === update.id);
            if (cartItem) {
                cartItem.isClientApproved = update.isClientApproved;
                await drCartItemRepository.save(cartItem);
            }
        }

        logger.info(`Updated approval status for ${drItemUpdates.length} DR items`);

        // Re-fetch cart to get updated items
        const updatedCart = await cartRepository.findOne({
            where: { id: cartId },
            relations: ['drCartItems'],
        });

        if (!updatedCart) {
            throw new Error('Cart not found after update');
        }

        // Calculate total amount from approved items only (but keep all items in cart)
        const approvedItems = updatedCart.drCartItems.filter((item) => item.isClientApproved);
        const totalAmount = approvedItems.reduce((sum, item) => sum + Number(item.price) * (item.quantity ?? 1), 0);

        // Update existing checkoutPr and billing details (they were created during token creation)
        const checkoutPrRepository = AppDataSource.getRepository(CheckoutPr);
        const billingDetailsPrRepository = AppDataSource.getRepository(BillingDetailsPr);

        // Find existing checkoutPr (must exist since it was created in createProposalPrToken)
        const checkoutPr = await checkoutPrRepository.findOne({
            where: { cart: { id: cart.id } },
        });

        if (!checkoutPr) {
            throw new Error('CheckoutPr not found. Proposal-pr may not have been created properly.');
        }

        // Update checkoutPr total amount
        checkoutPr.totalAmount = totalAmount;
        await checkoutPrRepository.save(checkoutPr);
        logger.info(`Updated checkoutPr: ${checkoutPr.id} with total: ${totalAmount}`);

        // Find existing billing details (must exist since it was created in createProposalPrToken)
        const billingDetailsPr = await billingDetailsPrRepository.findOne({
            where: { checkoutPr: { id: checkoutPr.id } },
        });

        if (!billingDetailsPr) {
            throw new Error('BillingDetailsPr not found. Proposal-pr may not have been created properly.');
        }

        // Update billing details with new information from client
        billingDetailsPr.firstName = updatedBillingInfo.firstName || billingDetailsPr.firstName || '';
        billingDetailsPr.lastName = updatedBillingInfo.lastName || billingDetailsPr.lastName || '';
        billingDetailsPr.projectName = updatedBillingInfo.projectName || billingDetailsPr.projectName || '';
        billingDetailsPr.telegramId = updatedBillingInfo.telegramId ?? billingDetailsPr.telegramId;
        billingDetailsPr.projectUrl = updatedBillingInfo.projectUrl ?? billingDetailsPr.projectUrl;
        billingDetailsPr.campaignLiveDate = updatedBillingInfo.campaignLiveDate ?? billingDetailsPr.campaignLiveDate;
        billingDetailsPr.note = updatedBillingInfo.note ?? billingDetailsPr.note;
        billingDetailsPr.managementFeePercentage = updatedBillingInfo.managementFeePercentage ?? billingDetailsPr.managementFeePercentage ?? 0;
        billingDetailsPr.proposalStatus = 'sent';
        billingDetailsPr.invoiceStatus = 'Not Paid';
        billingDetailsPr.paymentStatus = 'Unpaid';
        billingDetailsPr.totalAmount = totalAmount;
        await billingDetailsPrRepository.save(billingDetailsPr);
        logger.info(`Updated billing details: ${billingDetailsPr.id}`);
        logger.info(`Total approved items: ${approvedItems.length}, Total unapproved items: ${updatedCart.drCartItems.length - approvedItems.length}`);

        const checkoutDetails = {
            firstName: billingDetailsPr.firstName,
            lastName: billingDetailsPr.lastName,
            projectName: billingDetailsPr.projectName,
            telegramId: billingDetailsPr.telegramId,
            projectUrl: billingDetailsPr.projectUrl,
            email: cart.user.email,
            campaignLiveDate: billingDetailsPr.campaignLiveDate,
        };

        const finalCartId = cart.id;
        const finalTotalAmount = totalAmount;
        const email = cart.user.email;

        // Send response immediately
        res.status(HttpStatus.OK).json({
            message: 'Proposal-pr submitted successfully',
            checkoutPrId: checkoutPr.id,
            checkoutDetails,
            cartId: finalCartId,
            billingDetailsPrId: billingDetailsPr.id,
            totalAmount: finalTotalAmount,
            email,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage =
            error.message || 'An unknown error occurred while updating and submitting proposal-pr';

        logger.error(`Error updating and submitting proposal-pr (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
