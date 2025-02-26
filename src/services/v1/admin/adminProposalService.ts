import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { InfluencerCartItem } from '../../../entity/cart/InfluencerCartItem.entity';
import { Checkout } from '../../../entity/checkout';
import { BillingDetails } from '../../../entity/billingDetails';
import { User } from '../../../entity/auth';
import logger from '../../../config/logger';
import { fetchInvoiceDetails } from '../payment';



/**
 * Service function to create a proposal.
 * @param userId - ID of the user creating the proposal.
 * @param billingInfo - Billing details payload.
 * @param influencerItems - List of influencers and their pricing.
 * @returns Newly created checkout and billing details.
 */
export const createProposal = async (
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
    influencerItems: { influencerId: string; price: number }[]
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            /** ✅ Step 1: Create a Cart for the User **/
            const user = await transactionalEntityManager.findOne(User, { where: { id: userId } });
            if (!user) throw new Error('User not found');

            const cart = new Cart();
            cart.user = user;
            await transactionalEntityManager.save(cart);
            logger.info(`Cart created successfully for user: ${userId}, Cart ID: ${cart.id}`);

            /** ✅ Step 2: Add Influencer Cart Items **/
            const influencerCartItems = influencerItems.map((item) => {
                const cartItem = new InfluencerCartItem();
                cartItem.cart = cart;
                cartItem.influencer = { id: item.influencerId } as any; // Assign influencer by ID
                cartItem.price = item.price;
                return cartItem;
            });

            await transactionalEntityManager.save(influencerCartItems);
            logger.info(`Added ${influencerCartItems.length} influencer items to cart: ${cart.id}`);

            /** ✅ Step 3: Create a Checkout Entry **/
            const totalAmount = influencerCartItems.reduce((sum, item) => sum + item.price, 0);
            const checkout = new Checkout();
            checkout.cart = cart;
            checkout.totalAmount = totalAmount;

            await transactionalEntityManager.save(checkout);
            logger.info(`Checkout created with ID: ${checkout.id}, Total Amount: ${totalAmount}`);

            /** ✅ Step 4: Save Billing Details **/
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

            // calculate management fee on the total amount if management fee percentage is provided
            let managementFee = 0;
            if (billingInfo.managementFeePercentage) {
                managementFee = (totalAmount * billingInfo.managementFeePercentage) / 100;
            }

            // ✅ Step 4.5: Fetch the cart again to ensure it's committed
            const savedCart = await transactionalEntityManager.findOne(Cart, { where: { id: cart.id } });
            if (!savedCart) {
                throw new Error(`Cart not found after creation for id: ${cart.id}`);
            }

            /** ✅ Step 5: Call Invoice Function **/
            // TODO: Implement and call invoice generation function
            const checkoutDetails = { firstName: billingInfo.firstName, lastName: billingInfo.lastName, projectName: billingInfo.projectName, telegramId: billingInfo.telegramId, projectUrl: billingInfo.projectUrl, email: user.email, campaignLiveDate: billingInfo.campaignLiveDate };

            return {
                message: 'Proposal created successfully',
                checkoutId: checkout.id,
                checkoutDetails,
                cartId: savedCart.id,
                billingDetailsId: billingDetails.id,
                totalAmount,
                email: user.email,
            };
        } catch (error: any) {
            logger.error(`Error creating proposal: ${error.message}`);
            throw new Error(`Failed to create proposal: ${error.message}`);
        }
    });
};


// write a fn to get the invoice details provided jst checkout ID  or billing details, get billing details, its associated cart, from cart get influencer cart items
export const getProposalDetails = async (checkoutId: string) => {
    try {
        // Fetch cart by checkout ID
        const checkout = await AppDataSource.getRepository(Checkout).findOne({
            where: { id: checkoutId },
            relations: ['cart', 'cart.influencerCartItems', 'cart.influencerCartItems.influencer'],
        });

        if (!checkout) {
            throw new Error(`No checkout found for id: ${checkoutId}`);
        }
        return {
            checkout
        };
    } catch (error: any) {
        logger.error(`Error fetching invoice details: ${error.message}`);
        throw new Error(`Failed to fetch invoice details: ${error.message}`);
    }
};


// Edit proposal
export const editProposal = async (
    checkoutId: string,
    updatedBillingInfo: {
        managementFeePercentage?: number | 0,
        proposalStatus?: string,
        invoiceStatus?: string,
        paymentStatus?: string,
        note?: string,
    },
    updatedInfluencerItems: { influencerId: string; price: number }[]
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            /** ✅ Step 1: Fetch Checkout & Related Entities **/
            const checkout = await transactionalEntityManager.findOne(Checkout, {
                where: { id: checkoutId },
                relations: ['cart', 'cart.influencerCartItems', 'cart.user'], // ✅ No "billingDetails" in relations
            });

            if (!checkout) throw new Error(`Checkout not found for ID: ${checkoutId}`);
            const cart = checkout.cart;
            if (!cart) throw new Error(`Cart not found for checkout ID: ${checkoutId}`);

            // take the user from the cart
            const user = cart.user;

            /** ✅ Step 2: Fetch `BillingDetails` Separately **/
            const billingDetails = await transactionalEntityManager.findOne(BillingDetails, {
                where: { checkout: { id: checkoutId } }, // ✅ Fetch `BillingDetails` using `checkoutId`
            });

            if (!billingDetails) throw new Error(`BillingDetails not found for checkout ID: ${checkoutId}`);

            /** ✅ Step 3: Update Billing Details (Only if provided) **/
            Object.assign(billingDetails, {
                managementFeePercentage: updatedBillingInfo.managementFeePercentage ?? billingDetails.managementFeePercentage,
                proposalStatus: updatedBillingInfo.proposalStatus ?? billingDetails.proposalStatus,
                invoiceStatus: updatedBillingInfo.invoiceStatus ?? billingDetails.invoiceStatus,
                paymentStatus: updatedBillingInfo.paymentStatus ?? billingDetails.paymentStatus,
                note: updatedBillingInfo.note ?? billingDetails.note,
            });

            await transactionalEntityManager.save(billingDetails);
            logger.info(`Updated BillingDetails for checkout ID: ${checkoutId}`);

            /** ✅ Step 4: Remove Existing InfluencerCartItems **/
            await transactionalEntityManager.delete(InfluencerCartItem, { cart: { id: cart.id } });
            logger.info(`Removed existing influencer cart items for cart ID: ${cart.id}`);

            /** ✅ Step 5: Add New InfluencerCartItems **/
            const newInfluencerCartItems = updatedInfluencerItems.map((item) => {
                const cartItem = new InfluencerCartItem();
                cartItem.cart = cart;
                cartItem.influencer = { id: item.influencerId } as any;
                cartItem.price = item.price;
                return cartItem;
            });

            await transactionalEntityManager.save(newInfluencerCartItems);
            logger.info(`Added ${newInfluencerCartItems.length} influencer items to cart ID: ${cart.id}`);

            /** ✅ Step 6: Recalculate & Update `totalAmount` **/
            const calculatedTotalAmount = newInfluencerCartItems.reduce((sum, item) => sum + item.price, 0);
            checkout.totalAmount = calculatedTotalAmount;
            await transactionalEntityManager.save(checkout);

            logger.info(`Updated totalAmount for checkout ID: ${checkoutId}, New Total: ${checkout.totalAmount}`);
            const checkoutDetails = {
                firstName: billingDetails.firstName,
                lastName: billingDetails.lastName,
                projectName: billingDetails.projectName,
                telegramId: billingDetails.telegramId,
                projectUrl: billingDetails.projectUrl,
                // email: user.email,
                campaignLiveDate: billingDetails.campaignLiveDate
            };


            return {
                message: 'Proposal updated successfully',
                checkoutDetails,
                cartId: cart.id,
                calculatedTotalAmount,
                email: user?.email,
            };

        } catch (error: any) {
            logger.error(`Error editing proposal: ${error.message}`);
            throw new Error(`Failed to edit proposal: ${error.message}`);
        }
    });
};

























