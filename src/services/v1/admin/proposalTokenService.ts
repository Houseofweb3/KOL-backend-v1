import { AppDataSource } from '../../../config/data-source';
import { ProposalToken } from '../../../entity/proposalToken/ProposalToken.entity';
import { Cart } from '../../../entity/cart';
import { User } from '../../../entity/auth';
import { InfluencerCartItem } from '../../../entity/cart/InfluencerCartItem.entity';
import { Checkout } from '../../../entity/checkout';
import { BillingDetails } from '../../../entity/billingDetails';
import logger from '../../../config/logger';
import crypto from 'crypto';
import { sendProposalLinkEmail } from '../../../utils/communication/ses/emailSender';

/**
 * Generate a secure random token
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a proposal token and send email with link
 */
export const createProposalToken = async (
    userId: string,
    billingInfo: {
        firstName: string;
        lastName: string;
        projectName: string;
        telegramId?: string;
        projectUrl?: string;
        campaignLiveDate?: Date;
        note?: string;
        managementFeePercentage?: number | 0;
        discount?: number;
    },
    influencerItems: { influencerId: string; price: number }[],
    email: string,
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            // Create a cart for the user
            const user = await transactionalEntityManager.findOne(User, { where: { id: userId } });
            if (!user) throw new Error('User not found');

            const cart = new Cart();
            cart.user = user;
            await transactionalEntityManager.save(cart);
            logger.info(`Cart created for token generation: ${cart.id}`);

            // Create influencer cart items
            const influencerCartItems = influencerItems.map((item) => {
                const cartItem = new InfluencerCartItem();
                cartItem.cart = cart;
                cartItem.influencer = { id: item.influencerId } as any;
                cartItem.price = item.price;
                cartItem.isClientApproved = false; // Default to false
                return cartItem;
            });

            await transactionalEntityManager.save(influencerCartItems);
            logger.info(`Added ${influencerCartItems.length} influencer items to cart: ${cart.id}`);

            /** ✅ Step 3: Create a Checkout Entry (like old createProposal) **/
            const totalAmount = influencerCartItems.reduce((sum, item) => sum + Number(item.price), 0);
            const checkout = new Checkout();
            checkout.cart = cart;
            checkout.totalAmount = totalAmount;
            await transactionalEntityManager.save(checkout);
            logger.info(`Checkout created with ID: ${checkout.id}, Total Amount: ${totalAmount}`);

            /** ✅ Step 4: Save Billing Details (like old createProposal) **/
            const billingDetails = new BillingDetails();
            billingDetails.firstName = billingInfo.firstName;
            billingDetails.lastName = billingInfo.lastName;
            billingDetails.projectName = billingInfo.projectName;
            billingDetails.telegramId = billingInfo.telegramId;
            billingDetails.projectUrl = billingInfo.projectUrl;
            billingDetails.campaignLiveDate = billingInfo.campaignLiveDate;
            billingDetails.note = billingInfo.note;
            billingDetails.managementFeePercentage = billingInfo.managementFeePercentage;
            billingDetails.proposalStatus = 'sent';
            billingDetails.invoiceStatus = 'Not Paid';
            billingDetails.paymentStatus = 'Unpaid';
            billingDetails.totalAmount = totalAmount;
            billingDetails.checkout = checkout;
            await transactionalEntityManager.save(billingDetails);
            logger.info(`Billing details saved for checkout ID: ${checkout.id}`);

            // Generate token
            const token = generateToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 7 days

            // Create proposal token
            const proposalToken = new ProposalToken();
            proposalToken.token = token;
            proposalToken.expiresAt = expiresAt;
            proposalToken.isUsed = false;
            proposalToken.cart = cart;
            proposalToken.billingInfo = JSON.stringify(billingInfo);
            proposalToken.influencerItems = JSON.stringify(influencerItems);
            proposalToken.email = email;

            await transactionalEntityManager.save(proposalToken);
            logger.info(`Proposal token created: ${proposalToken.id}`);

            // Send email with link
            const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL || 'https://ampli5.ai/proposals';
            const proposalLink = `${frontendUrl}/${token}`;

            await sendProposalLinkEmail(email, billingInfo.firstName, proposalLink);

            const checkoutDetails = {
                firstName: billingInfo.firstName,
                lastName: billingInfo.lastName,
                projectName: billingInfo.projectName,
                telegramId: billingInfo.telegramId,
                projectUrl: billingInfo.projectUrl,
                email: email,
                campaignLiveDate: billingInfo.campaignLiveDate,
            };

            return {
                message: 'Proposal token created and email sent successfully',
                token: proposalToken.token,
                expiresAt: proposalToken.expiresAt,
                cartId: cart.id,
                checkoutId: checkout.id,
                checkoutDetails,
                billingDetailsId: billingDetails.id,
                totalAmount,
                email,
            };
        } catch (error: any) {
            logger.error(`Error creating proposal token: ${error.message}`);
            throw new Error(`Failed to create proposal token: ${error.message}`);
        }
    });
};

/**
 * Get proposal details by token
 */
export const getProposalByToken = async (token: string) => {
    try {
        const proposalToken = await AppDataSource.getRepository(ProposalToken).findOne({
            where: { token },
            relations: ['cart', 'cart.influencerCartItems', 'cart.influencerCartItems.influencer', 'cart.user'],
        });

        if (!proposalToken) {
            throw { status: 404, message: 'Invalid or expired token' };
        }

        // Check if token is expired
        if (new Date() > proposalToken.expiresAt) {
            throw { status: 400, message: 'Token has expired' };
        }

        // If token is used (proposal submitted), return simple success response
        if (proposalToken.isUsed) {
            return {
                isSubmitted: true,
                message: 'Your proposal has been submitted successfully',
                submittedAt: proposalToken.usedAt,
            };
        }

        const billingInfo = JSON.parse(proposalToken.billingInfo);

        return {
            isSubmitted: false,
            token: proposalToken.token,
            billingInfo,
            influencerItems: proposalToken.cart.influencerCartItems.map((item) => ({
                id: item.id,
                influencerId: item.influencer.id,
                influencer: item.influencer,
                price: item.price,
                note: item.note,
                profOfWork: item.profOfWork,
                isClientApproved: item.isClientApproved,
            })),
            cartId: proposalToken.cart.id,
            email: proposalToken.email,
        };
    } catch (error: any) {
        if (error.status) {
            throw error;
        }
        logger.error(`Error fetching proposal by token: ${error.message}`);
        throw { status: 500, message: `Failed to fetch proposal: ${error.message}` };
    }
};

/**
 * Update proposal without submitting (only update status and billing info)
 */
export const updateProposal = async (
    token: string,
    billingInfo: {
        firstName?: string;
        lastName?: string;
        projectName?: string;
        telegramId?: string;
        projectUrl?: string;
        campaignLiveDate?: Date;
        note?: string;
        managementFeePercentage?: number;
        discount?: number;
    },
    influencerItemUpdates: { id: string; isClientApproved: boolean }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            // Fetch proposal token
            const proposalToken = await transactionalEntityManager.findOne(ProposalToken, {
                where: { token },
                relations: ['cart', 'cart.influencerCartItems'],
            });

            if (!proposalToken) {
                throw { status: 404, message: 'Invalid token' };
            }

            // Check if token is expired
            if (new Date() > proposalToken.expiresAt) {
                throw { status: 400, message: 'Token has expired' };
            }

            // Check if token is already used
            if (proposalToken.isUsed) {
                throw { status: 400, message: 'This proposal has already been submitted' };
            }

            // Update influencer cart items approval status
            for (const update of influencerItemUpdates) {
                const cartItem = proposalToken.cart.influencerCartItems.find(
                    (item) => item.id === update.id,
                );
                if (cartItem) {
                    cartItem.isClientApproved = update.isClientApproved;
                    await transactionalEntityManager.save(cartItem);
                }
            }

            // Update billing info in token (for reference)
            const existingBillingInfo = JSON.parse(proposalToken.billingInfo);
            const updatedBillingInfo = { ...existingBillingInfo, ...billingInfo };
            proposalToken.billingInfo = JSON.stringify(updatedBillingInfo);

            // Mark token as used after successful update
            proposalToken.isUsed = true;
            proposalToken.usedAt = new Date();

            // Save token
            await transactionalEntityManager.save(proposalToken);

            logger.info(`Proposal updated successfully and marked as submitted for token: ${token}`);

            return proposalToken;
        } catch (error: any) {
            if (error.status) {
                throw error;
            }
            logger.error(`Error updating proposal: ${error.message}`);
            throw { status: 500, message: `Failed to update proposal: ${error.message}` };
        }
    });
};

/**
 * Update proposal and submit (mark token as used)
 */
export const updateAndSubmitProposal = async (
    token: string,
    billingInfo: {
        firstName?: string;
        lastName?: string;
        projectName?: string;
        telegramId?: string;
        projectUrl?: string;
        campaignLiveDate?: Date;
        note?: string;
        managementFeePercentage?: number;
        discount?: number;
    },
    influencerItemUpdates: { id: string; isClientApproved: boolean }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            // Fetch proposal token
            const proposalToken = await transactionalEntityManager.findOne(ProposalToken, {
                where: { token },
                relations: ['cart', 'cart.influencerCartItems'],
            });

            if (!proposalToken) {
                throw { status: 404, message: 'Invalid token' };
            }

            // Check if token is expired
            if (new Date() > proposalToken.expiresAt) {
                throw { status: 400, message: 'Token has expired' };
            }

            // Check if token is already used
            if (proposalToken.isUsed) {
                throw { status: 400, message: 'This proposal has already been submitted' };
            }

            // Update influencer cart items approval status
            for (const update of influencerItemUpdates) {
                const cartItem = proposalToken.cart.influencerCartItems.find(
                    (item) => item.id === update.id,
                );
                if (cartItem) {
                    cartItem.isClientApproved = update.isClientApproved;
                    await transactionalEntityManager.save(cartItem);
                }
            }

            // Update billing info in token (for reference)
            const existingBillingInfo = JSON.parse(proposalToken.billingInfo);
            const updatedBillingInfo = { ...existingBillingInfo, ...billingInfo };
            proposalToken.billingInfo = JSON.stringify(updatedBillingInfo);

            // Mark token as used
            proposalToken.isUsed = true;
            proposalToken.usedAt = new Date();
            await transactionalEntityManager.save(proposalToken);

            logger.info(`Proposal submitted successfully for token: ${token}`);

            return {
                message: 'Proposal submitted successfully',
                cartId: proposalToken.cart.id,
                billingInfo: updatedBillingInfo,
            };
        } catch (error: any) {
            if (error.status) {
                throw error;
            }
            logger.error(`Error updating and submitting proposal: ${error.message}`);
            throw { status: 500, message: `Failed to update proposal: ${error.message}` };
        }
    });
};

/**
 * Update existing proposal token and resend email (for updating and resending proposal)
 */
export const updateProposalTokenAndSendEmail = async (
    checkoutId: string,
    billingInfo: {
        firstName?: string;
        lastName?: string;
        projectName?: string;
        telegramId?: string;
        projectUrl?: string;
        campaignLiveDate?: Date;
        note?: string;
        managementFeePercentage?: number | 0;
        discount?: number;
    },
    influencerItems: { influencerId: string; price: number; note?: string; profOfWork?: string }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            /** Step 1: Fetch Checkout & Related Entities **/
            const checkout = await transactionalEntityManager.findOne(Checkout, {
                where: { id: checkoutId },
                relations: ['cart', 'cart.influencerCartItems', 'cart.user'],
            });

            if (!checkout) throw new Error(`Checkout not found for ID: ${checkoutId}`);
            const cart = checkout.cart;
            if (!cart) throw new Error(`Cart not found for checkout ID: ${checkoutId}`);
            const user = cart.user;
            if (!user) throw new Error(`User not found for cart ID: ${cart.id}`);

            /** Step 2: Fetch BillingDetails **/
            const billingDetails = await transactionalEntityManager.findOne(BillingDetails, {
                where: { checkout: { id: checkoutId } },
            });

            if (!billingDetails) throw new Error(`BillingDetails not found for checkout ID: ${checkoutId}`);

            /** Step 3: Update Billing Details **/
            if (billingInfo.firstName) billingDetails.firstName = billingInfo.firstName;
            if (billingInfo.lastName) billingDetails.lastName = billingInfo.lastName;
            if (billingInfo.projectName !== undefined) billingDetails.projectName = billingInfo.projectName;
            if (billingInfo.telegramId !== undefined) billingDetails.telegramId = billingInfo.telegramId;
            if (billingInfo.projectUrl !== undefined) billingDetails.projectUrl = billingInfo.projectUrl;
            if (billingInfo.campaignLiveDate !== undefined) billingDetails.campaignLiveDate = billingInfo.campaignLiveDate;
            if (billingInfo.note !== undefined) billingDetails.note = billingInfo.note;
            if (billingInfo.managementFeePercentage !== undefined) billingDetails.managementFeePercentage = billingInfo.managementFeePercentage;
            billingDetails.proposalStatus = 'sent';
            billingDetails.invoiceStatus = 'Not Paid';
            billingDetails.paymentStatus = 'Unpaid';

            await transactionalEntityManager.save(billingDetails);
            logger.info(`Updated BillingDetails for checkout ID: ${checkoutId}`);

            /** Step 4: Remove Existing InfluencerCartItems **/
            await transactionalEntityManager.delete(InfluencerCartItem, { cart: { id: cart.id } });
            logger.info(`Removed existing influencer cart items for cart ID: ${cart.id}`);

            /** Step 5: Add New InfluencerCartItems **/
            const newInfluencerCartItems = influencerItems.map((item) => {
                const cartItem = new InfluencerCartItem();
                cartItem.cart = cart;
                cartItem.influencer = { id: item.influencerId } as any;
                cartItem.price = item.price;
                cartItem.note = item.note;
                cartItem.profOfWork = item.profOfWork;
                cartItem.isClientApproved = false; // Reset approval status
                return cartItem;
            });

            await transactionalEntityManager.save(newInfluencerCartItems);
            logger.info(`Added ${newInfluencerCartItems.length} influencer items to cart ID: ${cart.id}`);

            /** Step 6: Recalculate & Update totalAmount **/
            const calculatedTotalAmount = newInfluencerCartItems.reduce((sum, item) => sum + Number(item.price), 0);
            checkout.totalAmount = calculatedTotalAmount;
            billingDetails.totalAmount = calculatedTotalAmount;
            await transactionalEntityManager.save(checkout);
            await transactionalEntityManager.save(billingDetails);
            logger.info(`Updated totalAmount for checkout ID: ${checkoutId}, New Total: ${calculatedTotalAmount}`);

            /** Step 7: Find or Update ProposalToken **/
            let proposalToken = await transactionalEntityManager.findOne(ProposalToken, {
                where: { cart: { id: cart.id } },
            });

            // Prepare billing info for token storage
            const billingInfoForToken = {
                firstName: billingDetails.firstName,
                lastName: billingDetails.lastName,
                projectName: billingDetails.projectName,
                telegramId: billingDetails.telegramId,
                projectUrl: billingDetails.projectUrl,
                campaignLiveDate: billingDetails.campaignLiveDate,
                note: billingDetails.note,
                managementFeePercentage: billingDetails.managementFeePercentage,
                discount: billingInfo.discount,
            };

            if (proposalToken) {
                // Update existing token
                const newToken = generateToken();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 30 days

                proposalToken.token = newToken;
                proposalToken.expiresAt = expiresAt;
                proposalToken.isUsed = false; // Reset to unused
                proposalToken.usedAt = null; // Clear usedAt
                proposalToken.billingInfo = JSON.stringify(billingInfoForToken);
                proposalToken.influencerItems = JSON.stringify(influencerItems);
                proposalToken.email = user.email;

                await transactionalEntityManager.save(proposalToken);
                logger.info(`Updated existing ProposalToken: ${proposalToken.id} with new token`);

                // Send email with new link
                const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL || 'https://ampli5.ai/proposals';
                const proposalLink = `${frontendUrl}/${newToken}`;

                await sendProposalLinkEmail(user.email, billingDetails.firstName, proposalLink);

                const checkoutDetails = {
                    firstName: billingDetails.firstName,
                    lastName: billingDetails.lastName,
                    projectName: billingDetails.projectName,
                    telegramId: billingDetails.telegramId,
                    projectUrl: billingDetails.projectUrl,
                    email: user.email,
                    campaignLiveDate: billingDetails.campaignLiveDate,
                };

                return {
                    message: 'Proposal updated and email sent successfully',
                    token: proposalToken.token,
                    expiresAt: proposalToken.expiresAt,
                    checkoutDetails,
                    cartId: cart.id,
                    calculatedTotalAmount,
                    email: user.email,
                };
            } else {
                // Create new token if doesn't exist (shouldn't happen in normal flow, but handle it)
                const newToken = generateToken();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                proposalToken = new ProposalToken();
                proposalToken.token = newToken;
                proposalToken.expiresAt = expiresAt;
                proposalToken.isUsed = false;
                proposalToken.cart = cart;
                proposalToken.billingInfo = JSON.stringify(billingInfoForToken);
                proposalToken.influencerItems = JSON.stringify(influencerItems);
                proposalToken.email = user.email;

                await transactionalEntityManager.save(proposalToken);
                logger.info(`Created new ProposalToken: ${proposalToken.id}`);

                // Send email with link
                const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL || 'https://ampli5.ai/proposals';
                const proposalLink = `${frontendUrl}/${newToken}`;

                await sendProposalLinkEmail(user.email, billingDetails.firstName, proposalLink);

                const checkoutDetails = {
                    firstName: billingDetails.firstName,
                    lastName: billingDetails.lastName,
                    projectName: billingDetails.projectName,
                    telegramId: billingDetails.telegramId,
                    projectUrl: billingDetails.projectUrl,
                    email: user.email,
                    campaignLiveDate: billingDetails.campaignLiveDate,
                };

                return {
                    message: 'Proposal updated and email sent successfully',
                    token: proposalToken.token,
                    expiresAt: proposalToken.expiresAt,
                    checkoutDetails,
                    cartId: cart.id,
                    calculatedTotalAmount,
                    email: user.email,
                };
            }
        } catch (error: any) {
            logger.error(`Error updating proposal token and sending email: ${error.message}`);
            throw new Error(`Failed to update proposal token and send email: ${error.message}`);
        }
    });
};





