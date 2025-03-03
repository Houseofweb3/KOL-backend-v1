import axios from 'axios';
import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { Checkout } from '../../../entity/checkout';
import { BillingDetails } from '../../../entity/billingDetails';
import { AppDataSource } from '../../../config/data-source';

const checkoutRepository = AppDataSource.getRepository(Checkout);
const cartRepository = AppDataSource.getRepository(Cart);
const billingDetailsRepository = AppDataSource.getRepository(BillingDetails);



export async function sendSlackNotification(message: string, webhookUrl: string): Promise<void> {
    try {
        await axios.post(webhookUrl, {
            text: message
        });
        console.log('Slack notification sent successfully');
    } catch (error) {
        console.error('Error sending Slack notification:', error);
    }
}

// Create a new Checkout
export const createCheckout = async (
    cartId: string,
    totalAmount: number,
    billingDetails: {
        firstName: string;
        lastName: string;
        projectName: string;
        telegramId?: string;
        projectUrl?: string;
        email?: string;
        campaignLiveDate?: Date;
        managementFeePercentage?: number;
        discount?: number;
        note?: string;
    },
): Promise<Checkout> => {
    try {
        const cart = await cartRepository.findOne({
            where: { id: cartId },
            relations: [
                'influencerCartItems',
                'influencerCartItems.influencer',
                'packageCartItems',
                'packageCartItems.package',
            ],
        });

        if (!cart) {
            throw new Error('Cart not found');
        }
        const newCheckout = checkoutRepository.create({ cart, totalAmount });

        await checkoutRepository.save(newCheckout);

        const newBillingDetails = billingDetailsRepository.create({
            ...billingDetails,
            proposalStatus: 'sent',
            checkout: newCheckout,
            totalAmount
        });

        await billingDetailsRepository.save(newBillingDetails);

        logger.info(`Created new checkout with id ${newCheckout.id}`);

        // Prepare influencer and package lists
        const influencerList = cart.influencerCartItems.map((item) => {
            const influencer = item.influencer;
            return `- *Name:* ${influencer.name}, *Platform:* ${influencer.platform}, *Price:* $${influencer.price}`;
        }).join('\n');

        const packageList = cart.packageCartItems.map((item) => {
            const pkg = item.package;
            return `- *Package:* ${pkg.header}, *Price:* $${pkg.cost}`;
        }).join('\n');

        // Slack message preparation
        const slackMessage = `
*Checkout Initiated* 🛒
*Total Amount:* $${totalAmount}
*Billing Details:*
  - *First Name:* ${billingDetails.firstName}
  - *Last Name:* ${billingDetails.lastName}
  - *Project Name:* ${billingDetails.projectName}
  - *Telegram ID:* ${billingDetails.telegramId || 'Not provided'}
  - *Project URL:* ${billingDetails.projectUrl || 'Not provided'}
  - *Email:* ${billingDetails.email || 'Not provided'}

*Influencers:*
${influencerList || 'No influencers in cart'}

*Packages:*
${packageList || 'No packages in cart'}

*Date:* ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
`;

        const slackWebhookUrl = 'https://hooks.slack.com/services/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'; // TODO: get from env

        sendSlackNotification(slackMessage, slackWebhookUrl).catch((error) => {
            console.error('Failed to send Slack notification:', error);
        });

        return newCheckout;
    } catch (error) {
        logger.error(`Error creating checkout: ${error}`);
        throw new Error('Error creating checkout');
    }
};


// Get Checkout by ID
export const getCheckoutById = async (id: string): Promise<Checkout | null> => {
    try {
        const checkout = await checkoutRepository.findOne({ where: { id }, relations: ['cart'] });

        return checkout;
    } catch (error) {
        logger.error(`Error fetching checkout with id ${id}: ${error}`);
        throw new Error('Error fetching checkout');
    }
};

// Delete a Checkout
export const deleteCheckout = async (id: string): Promise<void> => {
    try {
        await checkoutRepository.delete({ id });
        logger.info(`Deleted checkout with id ${id}`);
    } catch (error) {
        logger.error(`Error deleting checkout with id ${id}: ${error}`);
        throw new Error('Error deleting checkout');
    }
};


// Get all Checkouts with pagination and its billing details

export const getCheckouts = async (
    page: number = 1,
    limit: number = 10,
    sortField: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    searchTerm?: string,
) => {
    try {
        let queryBuilder = billingDetailsRepository
            .createQueryBuilder('billingDetails')
            .leftJoinAndSelect('billingDetails.checkout', 'checkout')
            .leftJoinAndSelect('checkout.cart', 'cart')
            .leftJoinAndSelect('cart.influencerCartItems', 'influencerCartItems')
            .leftJoinAndSelect('influencerCartItems.influencer', 'influencer')
            .leftJoinAndSelect('cart.user', 'user')
            .where(searchTerm ?
                `(user.fullname ILIKE :searchTerm)`
                : '1=1',
                { searchTerm: `%${searchTerm}%` });



        queryBuilder = queryBuilder
            .orderBy(`billingDetails.${sortField}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [billingDetails, total] = await queryBuilder.getManyAndCount();

        // retrn the response with pagination
        return {
            billingDetails,
            pagination: {
                page: page || 1,
                limit: limit || 10,
                total,
                totalPages: limit ? Math.ceil(total / limit) : 1,
            },
        };

    } catch (error) {
        logger.error(`Error fetching all checkouts: ${error}`);
        throw new Error('Error fetching all checkouts');
    }
};
