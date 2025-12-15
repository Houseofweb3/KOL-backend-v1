import axios from 'axios';
import { Cart } from '../../../entity/cart';
import logger from '../../../config/logger';
import { CheckoutPr } from '../../../entity/checkoutPr';
import { BillingDetailsPr } from '../../../entity/billingDetailsPr';
import { AppDataSource } from '../../../config/data-source';

const checkoutPrRepository = AppDataSource.getRepository(CheckoutPr);
const cartRepository = AppDataSource.getRepository(Cart);
const billingDetailsPrRepository = AppDataSource.getRepository(BillingDetailsPr);



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

// Create a new CheckoutPr
export const createCheckoutPr = async (
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
): Promise<CheckoutPr> => {
    try {
        const cart = await cartRepository.findOne({
            where: { id: cartId },
            relations: [
                'drCartItems',
                'drCartItems.dr',
                'packageCartItems',
                'packageCartItems.package',
            ],
        });

        if (!cart) {
            throw new Error('Cart not found');
        }
        const newCheckoutPr = checkoutPrRepository.create({ cart, totalAmount });

        await checkoutPrRepository.save(newCheckoutPr);

        const newBillingDetailsPr = billingDetailsPrRepository.create({
            ...billingDetails,
            proposalStatus: 'sent',
            checkoutPr: newCheckoutPr,
            totalAmount
        });

        await billingDetailsPrRepository.save(newBillingDetailsPr);

        logger.info(`Created new checkoutPr with id ${newCheckoutPr.id}`);

        // Prepare DR and package lists
        const drList = cart.drCartItems.map((item) => {
            const dr = item.dr;
            return `- *Website:* ${dr.website}, *DR:* ${dr.dr}, *Price:* $${item.price}`;
        }).join('\n');

        const packageList = cart.packageCartItems.map((item) => {
            const pkg = item.package;
            return `- *Package:* ${pkg.header}, *Price:* $${pkg.cost}`;
        }).join('\n');

        // Slack message preparation
        const slackMessage = `
*CheckoutPr Initiated* 🛒
*Total Amount:* $${totalAmount}
*Billing Details:*
  - *First Name:* ${billingDetails.firstName}
  - *Last Name:* ${billingDetails.lastName}
  - *Project Name:* ${billingDetails.projectName}
  - *Telegram ID:* ${billingDetails.telegramId || 'Not provided'}
  - *Project URL:* ${billingDetails.projectUrl || 'Not provided'}
  - *Email:* ${billingDetails.email || 'Not provided'}

*DR Items:*
${drList || 'No DR items in cart'}

*Packages:*
${packageList || 'No packages in cart'}

*Date:* ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
`;

        const slackWebhookUrl = 'https://hooks.slack.com/services/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'; // TODO: get from env

        sendSlackNotification(slackMessage, slackWebhookUrl).catch((error) => {
            console.error('Failed to send Slack notification:', error);
        });

        return newCheckoutPr;
    } catch (error) {
        logger.error(`Error creating checkoutPr: ${error}`);
        throw new Error('Error creating checkoutPr');
    }
};


// Get CheckoutPr by ID
export const getCheckoutPrById = async (id: string): Promise<CheckoutPr | null> => {
    try {
        const checkoutPr = await checkoutPrRepository.findOne({ where: { id }, relations: ['cart'] });

        return checkoutPr;
    } catch (error) {
        logger.error(`Error fetching checkoutPr with id ${id}: ${error}`);
        throw new Error('Error fetching checkoutPr');
    }
};

// Delete a CheckoutPr
export const deleteCheckoutPr = async (id: string): Promise<void> => {
    try {
        await checkoutPrRepository.delete({ id });
        logger.info(`Deleted checkoutPr with id ${id}`);
    } catch (error) {
        logger.error(`Error deleting checkoutPr with id ${id}: ${error}`);
        throw new Error('Error deleting checkoutPr');
    }
};


// Get all CheckoutPrs with pagination and its billing details
// Define filter type for the simplified format
type Filters = Array<Record<string, string | string[]>>;

export const getCheckoutPrs = async (
    page: number = 1,
    limit: number = 10,
    sortField: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    searchTerm?: string,
    filters: Filters = [],
) => {
    try {
        let queryBuilder = billingDetailsPrRepository
            .createQueryBuilder('billingDetailsPr')
            .leftJoinAndSelect('billingDetailsPr.checkoutPr', 'checkoutPr')
            .leftJoinAndSelect('checkoutPr.cart', 'cart')
            .leftJoinAndSelect('cart.drCartItems', 'drCartItems')
            .leftJoinAndSelect('drCartItems.dr', 'dr')
            .leftJoinAndSelect('cart.user', 'user')
            .where(searchTerm ? `(user.fullname ILIKE :searchTerm)` : '1=1', {
                searchTerm: `%${searchTerm}%`,
            });

        // Apply filters
        filters.forEach((filter, index) => {
            // Get the key and value from the filter object
            const key = Object.keys(filter)[0];
            const value = filter[key];

            if (key === 'proposalStatus') {
                if (Array.isArray(value)) {
                    // If array includes 'sent', also consider null/undefined values
                    if (value.includes('sent')) {
                        queryBuilder = queryBuilder.andWhere(
                            `(billingDetailsPr.${key} IN (:...${key}${index}) OR billingDetailsPr.${key} IS NULL)`,
                            {
                                [`${key}${index}`]: value,
                            },
                        );
                    } else {
                        queryBuilder = queryBuilder.andWhere(
                            `billingDetailsPr.${key} IN (:...${key}${index})`,
                            {
                                [`${key}${index}`]: value,
                            },
                        );
                    }
                } else if (value === 'sent') {
                    // If value is 'sent', also consider null/undefined values
                    queryBuilder = queryBuilder.andWhere(
                        `(billingDetailsPr.${key} = :${key}${index} OR billingDetailsPr.${key} IS NULL)`,
                        {
                            [`${key}${index}`]: value,
                        },
                    );
                } else {
                    // For other values (approved, rejected, asked_for_change), don't include null
                    queryBuilder = queryBuilder.andWhere(
                        `billingDetailsPr.${key} = :${key}${index}`,
                        {
                            [`${key}${index}`]: value,
                        },
                    );
                }
            } else if (key === 'invoiceStatus') {
                if (Array.isArray(value)) {
                    // If array includes 'not_generated', also consider null/undefined values
                    if (value.includes('not_generated')) {
                        queryBuilder = queryBuilder.andWhere(
                            `(billingDetailsPr.${key} IN (:...${key}${index}) OR billingDetailsPr.${key} IS NULL)`,
                            {
                                [`${key}${index}`]: value,
                            },
                        );
                    } else {
                        queryBuilder = queryBuilder.andWhere(
                            `billingDetailsPr.${key} IN (:...${key}${index})`,
                            {
                                [`${key}${index}`]: value,
                            },
                        );
                    }
                } else if (value === 'not_generated') {
                    // If value is 'not_generated', also consider null/undefined values
                    queryBuilder = queryBuilder.andWhere(
                        `(billingDetailsPr.${key} = :${key}${index} OR billingDetailsPr.${key} IS NULL)`,
                        {
                            [`${key}${index}`]: value,
                        },
                    );
                } else {
                    // For other values (generated, paid), don't include null
                    queryBuilder = queryBuilder.andWhere(
                        `billingDetailsPr.${key} = :${key}${index}`,
                        {
                            [`${key}${index}`]: value,
                        },
                    );
                }
            }
        });

        queryBuilder = queryBuilder
            .orderBy(`billingDetailsPr.${sortField}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [billingDetailsPr, total] = await queryBuilder.getManyAndCount();

        // return the response with pagination
        return {
            billingDetailsPr,
            pagination: {
                page: page || 1,
                limit: limit || 10,
                total,
                totalPages: limit ? Math.ceil(total / limit) : 1,
            },
        };
    } catch (error) {
        logger.error(`Error fetching all checkoutPrs: ${error}`);
        throw new Error('Error fetching all checkoutPrs');
    }
};

