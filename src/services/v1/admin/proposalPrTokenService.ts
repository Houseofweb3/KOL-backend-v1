import { AppDataSource } from '../../../config/data-source';
import { ProposalPrToken } from '../../../entity/proposalToken/ProposalPrToken.entity';
import { Cart } from '../../../entity/cart';
import { User } from '../../../entity/auth';
import { DrCartItem } from '../../../entity/cart/DrCartItem.entity';
import { CheckoutPr } from '../../../entity/checkoutPr';
import { BillingDetailsPr } from '../../../entity/billingDetailsPr';
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
 * Create a proposal-pr token and send email with link
 */
export const createProposalPrToken = async (
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
    drItems: { drId: string; price: number; quantity?: number; note?: string; profOfWork?: string }[],
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

            // Create DR cart items
            const drCartItems = drItems.map((item) => {
                const cartItem = new DrCartItem();
                cartItem.cart = cart;
                cartItem.dr = { id: item.drId } as any;
                cartItem.price = item.price;
                cartItem.isClientApproved = false; // Default to false
                cartItem.quantity = item.quantity ?? 1;
                cartItem.note = item.note;
                cartItem.profOfWork = item.profOfWork;
                return cartItem;
            });

            await transactionalEntityManager.save(drCartItems);
            logger.info(`Added ${drCartItems.length} DR items to cart: ${cart.id}`);

            /** ✅ Step 3: Create a CheckoutPr Entry (like old createProposalPr) **/
            const totalAmount = drCartItems.reduce((sum, item) => sum + Number(item.price) * (item.quantity ?? 1), 0);
            const checkoutPr = new CheckoutPr();
            checkoutPr.cart = cart;
            checkoutPr.totalAmount = totalAmount;
            await transactionalEntityManager.save(checkoutPr);
            logger.info(`CheckoutPr created with ID: ${checkoutPr.id}, Total Amount: ${totalAmount}`);

            /** ✅ Step 4: Save BillingDetailsPr (like old createProposalPr) **/
            const billingDetailsPr = new BillingDetailsPr();
            billingDetailsPr.firstName = billingInfo.firstName;
            billingDetailsPr.lastName = billingInfo.lastName;
            billingDetailsPr.projectName = billingInfo.projectName;
            billingDetailsPr.telegramId = billingInfo.telegramId;
            billingDetailsPr.projectUrl = billingInfo.projectUrl;
            billingDetailsPr.campaignLiveDate = billingInfo.campaignLiveDate;
            billingDetailsPr.note = billingInfo.note;
            billingDetailsPr.managementFeePercentage = billingInfo.managementFeePercentage;
            billingDetailsPr.proposalStatus = 'sent';
            billingDetailsPr.invoiceStatus = 'Not Paid';
            billingDetailsPr.paymentStatus = 'Unpaid';
            billingDetailsPr.totalAmount = totalAmount;
            billingDetailsPr.checkoutPr = checkoutPr;
            await transactionalEntityManager.save(billingDetailsPr);
            logger.info(`BillingDetailsPr saved for checkoutPr ID: ${checkoutPr.id}`);

            // Generate token
            const token = generateToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 30 days

            // Create proposal-pr token
            const proposalPrToken = new ProposalPrToken();
            proposalPrToken.token = token;
            proposalPrToken.expiresAt = expiresAt;
            proposalPrToken.isUsed = false;
            proposalPrToken.cart = cart;
            proposalPrToken.billingInfo = JSON.stringify(billingInfo);
            proposalPrToken.drItems = JSON.stringify(drItems);
            proposalPrToken.email = email;

            await transactionalEntityManager.save(proposalPrToken);
            logger.info(`Proposal-pr token created: ${proposalPrToken.id}`);

            // Send email with link
            const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL || 'https://ampli5.ai/proposals';
            const proposalLink = `${frontendUrl}/pr/${token}`;

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
                message: 'Proposal-pr token created and email sent successfully',
                token: proposalPrToken.token,
                expiresAt: proposalPrToken.expiresAt,
                cartId: cart.id,
                checkoutPrId: checkoutPr.id,
                checkoutDetails,
                billingDetailsPrId: billingDetailsPr.id,
                totalAmount,
                email,
            };
        } catch (error: any) {
            logger.error(`Error creating proposal-pr token: ${error.message}`);
            throw new Error(`Failed to create proposal-pr token: ${error.message}`);
        }
    });
};

/**
 * Get proposal-pr details by token
 */
export const getProposalPrByToken = async (token: string) => {
    try {
        const proposalPrToken = await AppDataSource.getRepository(ProposalPrToken).findOne({
            where: { token },
            relations: ['cart', 'cart.drCartItems', 'cart.drCartItems.dr', 'cart.user'],
        });

        if (!proposalPrToken) {
            throw { status: 404, message: 'Invalid or expired token' };
        }

        // Check if token is expired
        if (new Date() > proposalPrToken.expiresAt) {
            throw { status: 400, message: 'Token has expired' };
        }

        // If token is used (proposal submitted), return simple success response
        if (proposalPrToken.isUsed) {
            return {
                isSubmitted: true,
                message: 'Your proposal-pr has been submitted successfully',
                submittedAt: proposalPrToken.usedAt,
            };
        }

        const billingInfo = JSON.parse(proposalPrToken.billingInfo);

        return {
            isSubmitted: false,
            token: proposalPrToken.token,
            billingInfo,
            drItems: proposalPrToken.cart.drCartItems.map((item) => ({
                id: item.id,
                drId: item.dr.id,
                dr: {
                    ...item.dr,
                    quantity: item.quantity?.toString() || '1', // Add quantity to dr object for frontend convenience
                },
                price: item.price,
                note: item.note,
                profOfWork: item.profOfWork,
                quantity: item.quantity,
                isClientApproved: item.isClientApproved,
            })),
            cartId: proposalPrToken.cart.id,
            email: proposalPrToken.email,
        };
    } catch (error: any) {
        if (error.status) {
            throw error;
        }
        logger.error(`Error fetching proposal-pr by token: ${error.message}`);
        throw { status: 500, message: `Failed to fetch proposal-pr: ${error.message}` };
    }
};

/**
 * Update proposal-pr without submitting (only update status and billing info)
 */
export const updateProposalPr = async (
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
    drItemUpdates: { id: string; isClientApproved: boolean }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            // Fetch proposal-pr token
            const proposalPrToken = await transactionalEntityManager.findOne(ProposalPrToken, {
                where: { token },
                relations: ['cart', 'cart.drCartItems'],
            });

            if (!proposalPrToken) {
                throw { status: 404, message: 'Invalid token' };
            }

            // Check if token is expired
            if (new Date() > proposalPrToken.expiresAt) {
                throw { status: 400, message: 'Token has expired' };
            }

            // Check if token is already used
            if (proposalPrToken.isUsed) {
                throw { status: 400, message: 'This proposal-pr has already been submitted' };
            }

            // Update DR cart items approval status
            for (const update of drItemUpdates) {
                const cartItem = proposalPrToken.cart.drCartItems.find(
                    (item) => item.id === update.id,
                );
                if (cartItem) {
                    cartItem.isClientApproved = update.isClientApproved;
                    await transactionalEntityManager.save(cartItem);
                }
            }

            // Update billing info in token (for reference)
            const existingBillingInfo = JSON.parse(proposalPrToken.billingInfo);
            const updatedBillingInfo = { ...existingBillingInfo, ...billingInfo };
            proposalPrToken.billingInfo = JSON.stringify(updatedBillingInfo);

            // Mark token as used after successful update
            proposalPrToken.isUsed = true;
            proposalPrToken.usedAt = new Date();

            // Save token
            await transactionalEntityManager.save(proposalPrToken);

            logger.info(`Proposal-pr updated successfully and marked as submitted for token: ${token}`);

            return proposalPrToken;
        } catch (error: any) {
            if (error.status) {
                throw error;
            }
            logger.error(`Error updating proposal-pr: ${error.message}`);
            throw { status: 500, message: `Failed to update proposal-pr: ${error.message}` };
        }
    });
};

/**
 * Update proposal-pr and submit (mark token as used)
 */
export const updateAndSubmitProposalPr = async (
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
    drItemUpdates: { id: string; isClientApproved: boolean }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            // Fetch proposal-pr token
            const proposalPrToken = await transactionalEntityManager.findOne(ProposalPrToken, {
                where: { token },
                relations: ['cart', 'cart.drCartItems'],
            });

            if (!proposalPrToken) {
                throw { status: 404, message: 'Invalid token' };
            }

            // Check if token is expired
            if (new Date() > proposalPrToken.expiresAt) {
                throw { status: 400, message: 'Token has expired' };
            }

            // Check if token is already used
            if (proposalPrToken.isUsed) {
                throw { status: 400, message: 'This proposal-pr has already been submitted' };
            }

            // Update DR cart items approval status
            for (const update of drItemUpdates) {
                const cartItem = proposalPrToken.cart.drCartItems.find(
                    (item) => item.id === update.id,
                );
                if (cartItem) {
                    cartItem.isClientApproved = update.isClientApproved;
                    await transactionalEntityManager.save(cartItem);
                }
            }

            // Update billing info in token (for reference)
            const existingBillingInfo = JSON.parse(proposalPrToken.billingInfo);
            const updatedBillingInfo = { ...existingBillingInfo, ...billingInfo, proposalStatus: 'sent' };
            console.log(updatedBillingInfo, "updatedBillingInfo");

            proposalPrToken.billingInfo = JSON.stringify(updatedBillingInfo);

            // Mark token as used
            proposalPrToken.isUsed = true;
            proposalPrToken.usedAt = new Date();
            await transactionalEntityManager.save(proposalPrToken);

            logger.info(`Proposal-pr submitted successfully for token: ${token}`);

            return {
                message: 'Proposal-pr submitted successfully',
                cartId: proposalPrToken.cart.id,
                billingInfo: updatedBillingInfo,
            };
        } catch (error: any) {
            if (error.status) {
                throw error;
            }
            logger.error(`Error updating and submitting proposal-pr: ${error.message}`);
            throw { status: 500, message: `Failed to update proposal-pr: ${error.message}` };
        }
    });
};

/**
 * Update existing proposal-pr token and resend email (for updating and resending proposal-pr)
 */
export const updateProposalPrTokenAndSendEmail = async (
    checkoutPrId: string,
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
    drItems: { drId: string; price: number; note?: string; profOfWork?: string; quantity?: number }[],
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            /** Step 1: Fetch CheckoutPr & Related Entities **/
            const checkoutPr = await transactionalEntityManager.findOne(CheckoutPr, {
                where: { id: checkoutPrId },
                relations: ['cart', 'cart.drCartItems', 'cart.user'],
            });

            if (!checkoutPr) throw new Error(`CheckoutPr not found for ID: ${checkoutPrId}`);
            const cart = checkoutPr.cart;
            if (!cart) throw new Error(`Cart not found for checkoutPr ID: ${checkoutPrId}`);
            const user = cart.user;
            if (!user) throw new Error(`User not found for cart ID: ${cart.id}`);

            /** Step 2: Fetch BillingDetailsPr **/
            const billingDetailsPr = await transactionalEntityManager.findOne(BillingDetailsPr, {
                where: { checkoutPr: { id: checkoutPrId } },
            });

            if (!billingDetailsPr) throw new Error(`BillingDetailsPr not found for checkoutPr ID: ${checkoutPrId}`);

            /** Step 3: Update Billing Details **/
            if (billingInfo.firstName) billingDetailsPr.firstName = billingInfo.firstName;
            if (billingInfo.lastName) billingDetailsPr.lastName = billingInfo.lastName;
            if (billingInfo.projectName !== undefined) billingDetailsPr.projectName = billingInfo.projectName;
            if (billingInfo.telegramId !== undefined) billingDetailsPr.telegramId = billingInfo.telegramId;
            if (billingInfo.projectUrl !== undefined) billingDetailsPr.projectUrl = billingInfo.projectUrl;
            if (billingInfo.campaignLiveDate !== undefined) billingDetailsPr.campaignLiveDate = billingInfo.campaignLiveDate;
            if (billingInfo.note !== undefined) billingDetailsPr.note = billingInfo.note;
            if (billingInfo.managementFeePercentage !== undefined) billingDetailsPr.managementFeePercentage = billingInfo.managementFeePercentage;
            if (billingInfo.discount !== undefined) billingDetailsPr.discount = billingInfo.discount; // Store discount in BillingDetailsPr
            billingDetailsPr.proposalStatus = 'asked_for_change';
            billingDetailsPr.invoiceStatus = 'Not Paid';
            billingDetailsPr.paymentStatus = 'Unpaid';

            await transactionalEntityManager.save(billingDetailsPr);
            logger.info(`Updated BillingDetailsPr for checkoutPr ID: ${checkoutPrId}`);

            /** Step 4: Fetch Existing DrCartItems **/
            const existingCartItems = await transactionalEntityManager.find(DrCartItem, {
                where: { cart: { id: cart.id } },
                relations: ['dr'],
            });
            logger.info(`Found ${existingCartItems.length} existing DR cart items for cart ID: ${cart.id}`);

            /** Step 5: Update or Create DrCartItems **/
            const updatedCartItems: DrCartItem[] = [];
            const updatedDrIds = new Set(drItems.map(item => item.drId));

            // Update existing items or create new ones
            for (const item of drItems) {
                const existingItem = existingCartItems.find(
                    (cartItem) => cartItem.dr.id === item.drId
                );

                if (existingItem) {
                    // Update existing item
                    existingItem.price = item.price;
                    existingItem.note = item.note ?? existingItem.note;
                    existingItem.profOfWork = item.profOfWork ?? existingItem.profOfWork;
                    existingItem.quantity = item.quantity ?? existingItem.quantity ?? 1; // Update quantity
                    // Preserve isClientApproved status - don't reset it
                    await transactionalEntityManager.save(existingItem);
                    updatedCartItems.push(existingItem);
                    logger.info(`Updated existing cart item for DR ID: ${item.drId}, quantity: ${existingItem.quantity}`);
                } else {
                    // Create new item
                    const newCartItem = new DrCartItem();
                    newCartItem.cart = cart;
                    newCartItem.dr = { id: item.drId } as any;
                    newCartItem.price = item.price;
                    newCartItem.note = item.note;
                    newCartItem.profOfWork = item.profOfWork;
                    newCartItem.quantity = item.quantity ?? 1; // Set quantity, default to 1
                    newCartItem.isClientApproved = false; // Default to false for new items
                    const savedItem = await transactionalEntityManager.save(newCartItem);
                    updatedCartItems.push(savedItem);
                    logger.info(`Created new cart item for DR ID: ${item.drId}, quantity: ${savedItem.quantity}`);
                }
            }

            // Remove items that are not in the updated list
            const itemsToRemove = existingCartItems.filter(
                (item) => !updatedDrIds.has(item.dr.id)
            );

            if (itemsToRemove.length > 0) {
                await transactionalEntityManager.remove(itemsToRemove);
                logger.info(`Removed ${itemsToRemove.length} cart items that were not in the update list`);
            }

            logger.info(`Updated ${updatedCartItems.length} DR items in cart ID: ${cart.id}`);

            /** Step 6: Recalculate & Update totalAmount with Discount **/
            // Calculate subtotal (sum of all items with quantity)
            const subtotal = updatedCartItems.reduce(
                (sum, item) => sum + Number(item.price) * (item.quantity ?? 1),
                0
            );

            // Apply discount if provided (discount is a percentage)
            const discount = billingInfo.discount ?? 0;
            const discountAmount = discount > 0 ? (subtotal * discount) / 100 : 0;
            const calculatedTotalAmount = subtotal - discountAmount;

            checkoutPr.totalAmount = calculatedTotalAmount;
            billingDetailsPr.totalAmount = calculatedTotalAmount;
            await transactionalEntityManager.save(checkoutPr);
            await transactionalEntityManager.save(billingDetailsPr);
            logger.info(`Updated totalAmount for checkoutPr ID: ${checkoutPrId}, Subtotal: ${subtotal}, Discount: ${discount}%, Discount Amount: ${discountAmount}, New Total: ${calculatedTotalAmount}`);

            /** Step 7: Find or Update ProposalPrToken **/
            let proposalPrToken = await transactionalEntityManager.findOne(ProposalPrToken, {
                where: { cart: { id: cart.id } },
            });

            // Prepare billing info for token storage
            const billingInfoForToken = {
                firstName: billingDetailsPr.firstName,
                lastName: billingDetailsPr.lastName,
                projectName: billingDetailsPr.projectName,
                telegramId: billingDetailsPr.telegramId,
                projectUrl: billingDetailsPr.projectUrl,
                campaignLiveDate: billingDetailsPr.campaignLiveDate,
                note: billingDetailsPr.note,
                managementFeePercentage: billingDetailsPr.managementFeePercentage,
                discount: billingInfo.discount,
            };

            if (proposalPrToken) {
                // Update existing token
                const newToken = generateToken();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 30 days

                proposalPrToken.token = newToken;
                proposalPrToken.expiresAt = expiresAt;
                proposalPrToken.isUsed = false; // Reset to unused
                proposalPrToken.usedAt = null; // Clear usedAt
                proposalPrToken.billingInfo = JSON.stringify(billingInfoForToken);
                proposalPrToken.drItems = JSON.stringify(drItems);
                proposalPrToken.email = user.email;

                await transactionalEntityManager.save(proposalPrToken);
                logger.info(`Updated existing ProposalPrToken: ${proposalPrToken.id} with new token`);

                // Send email with new link
                const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL +"-pr" || 'https://ampli5.ai/proposals-pr';
                const proposalLink = `${frontendUrl}/${newToken}`;

                await sendProposalLinkEmail(user.email, billingDetailsPr.firstName, proposalLink);

                const checkoutDetails = {
                    firstName: billingDetailsPr.firstName,
                    lastName: billingDetailsPr.lastName,
                    projectName: billingDetailsPr.projectName,
                    telegramId: billingDetailsPr.telegramId,
                    projectUrl: billingDetailsPr.projectUrl,
                    email: user.email,
                    campaignLiveDate: billingDetailsPr.campaignLiveDate,
                };

                return {
                    message: 'Proposal-pr updated and email sent successfully',
                    token: proposalPrToken.token,
                    expiresAt: proposalPrToken.expiresAt,
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

                proposalPrToken = new ProposalPrToken();
                proposalPrToken.token = newToken;
                proposalPrToken.expiresAt = expiresAt;
                proposalPrToken.isUsed = false;
                proposalPrToken.cart = cart;
                proposalPrToken.billingInfo = JSON.stringify(billingInfoForToken);
                proposalPrToken.drItems = JSON.stringify(drItems);
                proposalPrToken.email = user.email;

                await transactionalEntityManager.save(proposalPrToken);
                logger.info(`Created new ProposalPrToken: ${proposalPrToken.id}`);

                // Send email with link
                const frontendUrl = process.env.CLIENT_PROPOSAL_WEB_URL + "-pr" || 'https://ampli5.ai/proposals-pr';
                const proposalLink = `${frontendUrl}/${newToken}`;

                await sendProposalLinkEmail(user.email, billingDetailsPr.firstName, proposalLink);

                const checkoutDetails = {
                    firstName: billingDetailsPr.firstName,
                    lastName: billingDetailsPr.lastName,
                    projectName: billingDetailsPr.projectName,
                    telegramId: billingDetailsPr.telegramId,
                    projectUrl: billingDetailsPr.projectUrl,
                    email: user.email,
                    campaignLiveDate: billingDetailsPr.campaignLiveDate,
                };

                return {
                    message: 'Proposal-pr updated and email sent successfully',
                    token: proposalPrToken.token,
                    expiresAt: proposalPrToken.expiresAt,
                    checkoutDetails,
                    cartId: cart.id,
                    calculatedTotalAmount,
                    email: user.email,
                };
            }
        } catch (error: any) {
            logger.error(`Error updating proposal-pr token and sending email: ${error.message}`);
            throw new Error(`Failed to update proposal-pr token and send email: ${error.message}`);
        }
    });
};
