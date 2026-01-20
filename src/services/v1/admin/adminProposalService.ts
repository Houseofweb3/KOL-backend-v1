import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { InfluencerCartItem } from '../../../entity/cart/InfluencerCartItem.entity';
import { Checkout } from '../../../entity/checkout';
import { BillingDetails } from '../../../entity/billingDetails';
import { User } from '../../../entity/auth';
import logger from '../../../config/logger';
import fs from 'fs/promises'
import { resolve } from 'path';
import ejs from 'ejs'
import { convertHtmlToPdfBuffer, uploadPdfToS3 } from '../../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../../utils/communication/ses/emailSender';
import { Between } from 'typeorm';
import { formatClientAddress, getDatesInRange, getStartDateFromTimeRange, getStartOfDay } from '../../../helpers';

const invoiceEmailInfo = (
    clientName: string,
) => {
    const emailText = `Dear ${clientName},

Please find attached the invoice for your recent subscription to Ampli5.AI's KOL SaaS platform. We're excited to continue supporting your influencer marketing initiatives with our industry-leading solution.

Payment Methods: Crypto wallet address mentioned in T&C, please proceed with a $10 test transaction first

WHY CLIENTS CHOOSE AMPLI5.AI

Our commitment to excellence is reflected in our core strengths:
* Rapid Turnaround Time: Under 72 working hours for campaign setup and implementation, ensuring your influencer campaigns launch quickly and efficiently
* KPI-Driven Approach: All campaigns are built around your specific performance metrics, with customizable dashboards and real-time tracking
* Transparent Pricing: No hidden fees or surprise costs—what you see is what you pay
* Data-Driven Results: Comprehensive analytics and performance insights throughout your campaign
* Post-Campaign Case Studies: Detailed analysis and performance reports after campaign completion to demonstrate ROI and inform future strategies

NEXT STEPS
1. Please process payment by 3 days within invoice generation date.
2. Your dedicated account manager, Kayaash - kayaash.s@houseofweb3.com, will schedule your next strategic review call

Best regards,
Ampli5 Team
`;

    const emailHtml = `<p>Dear ${clientName},</p>

<p>Please find attached the invoice for your recent subscription to Ampli5.AI's KOL SaaS platform. We're excited to continue supporting your influencer marketing initiatives with our industry-leading solution.</p>

<p><strong>Payment Methods:</strong> Crypto wallet address mentioned in T&C, please proceed with a $10 test transaction first</p>

<h3>WHY CLIENTS CHOOSE AMPLI5.AI</h3>

<p>Our commitment to excellence is reflected in our core strengths:</p>
<ul>
  <li><strong>Rapid Turnaround Time:</strong> Under 72 working hours for campaign setup and implementation, ensuring your influencer campaigns launch quickly and efficiently</li>
  <li><strong>KPI-Driven Approach:</strong> All campaigns are built around your specific performance metrics, with customizable dashboards and real-time tracking</li>
  <li><strong>Transparent Pricing:</strong> No hidden fees or surprise costs—what you see is what you pay</li>
  <li><strong>Data-Driven Results:</strong> Comprehensive analytics and performance insights throughout your campaign</li>
  <li><strong>Post-Campaign Case Studies:</strong> Detailed analysis and performance reports after campaign completion to demonstrate ROI and inform future strategies</li>
</ul>

<h3>NEXT STEPS</h3>
<ol>
  <li>Please process payment by 3 days within invoice generation date.</li>
  <li>Your dedicated account manager, Kayaash - kayaash.s@houseofweb3.com, will schedule your next strategic review call</li>
</ol>

<p>Best regards,<br>
Ampli5 Team</p>`;

    return { emailText, emailHtml };
};

export default invoiceEmailInfo;




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
                cartItem.isClientApproved = false;
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
            billingDetails.discount = billingInfo.discount;

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
        const checkoutRes = await AppDataSource.getRepository(Checkout).findOne({
            where: { id: checkoutId },
            relations: ['cart', 'cart.influencerCartItems', 'cart.influencerCartItems.influencer', 'cart.user'],
        });

        // fetch billing details from checkout
        const billingDetails = await AppDataSource.getRepository(BillingDetails).findOne({
            where: { checkout: { id: checkoutId } },
        });

        let checkout;

        // add the billing details to the checkout object
        if (checkoutRes) {
            checkout = {
                ...checkoutRes,
                billingDetails,
            }
        }

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
        discount?: number,
    },
    updatedInfluencerItems: { influencerId: string; price: number, note?: string, profOfWork?: string,quantity?: number}[]
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
                discount: updatedBillingInfo.discount ?? billingDetails.discount,
            });

            await transactionalEntityManager.save(billingDetails);
            logger.info(`Updated BillingDetails for checkout ID: ${checkoutId}`);

            /** ✅ Step 4: Fetch Existing InfluencerCartItems **/
            const existingCartItems = await transactionalEntityManager.find(InfluencerCartItem, {
                where: { cart: { id: cart.id } },
                relations: ['influencer'],
            });
            logger.info(`Found ${existingCartItems.length} existing influencer cart items for cart ID: ${cart.id}`);

            /** ✅ Step 5: Update or Create InfluencerCartItems **/
            const updatedCartItems: InfluencerCartItem[] = [];
            const updatedInfluencerIds = new Set(updatedInfluencerItems.map(item => item.influencerId));

            // Update existing items or create new ones
            for (const item of updatedInfluencerItems) {
                const existingItem = existingCartItems.find(
                    (cartItem) => cartItem.influencer.id === item.influencerId
                );

                if (existingItem) {
                    // Update existing item
                    existingItem.price = item.price;
                    existingItem.note = item.note ?? existingItem.note;
                    existingItem.profOfWork = item.profOfWork ?? existingItem.profOfWork;
                    existingItem.quantity = item.quantity ?? existingItem.quantity;
                    // Preserve isClientApproved status if it exists
                    await transactionalEntityManager.save(existingItem);
                    updatedCartItems.push(existingItem);
                    logger.info(`Updated existing cart item for influencer ID: ${item.influencerId}`);
                } else {
                    // Create new item
                    const newCartItem = new InfluencerCartItem();
                    newCartItem.cart = cart;
                    newCartItem.influencer = { id: item.influencerId } as any;
                    newCartItem.price = item.price;
                    newCartItem.note = item.note;
                    newCartItem.profOfWork = item.profOfWork;
                    newCartItem.quantity = item.quantity ?? 1;
                    newCartItem.isClientApproved = false; // Default to false for new items
                    const savedItem = await transactionalEntityManager.save(newCartItem);
                    updatedCartItems.push(savedItem);
                    logger.info(`Created new cart item for influencer ID: ${item.influencerId}`);
                }
            }

            // Remove items that are not in the updated list (optional - comment out if you want to keep all items)
            const itemsToRemove = existingCartItems.filter(
                (item) => !updatedInfluencerIds.has(item.influencer.id)
            );
            
            if (itemsToRemove.length > 0) {
                await transactionalEntityManager.remove(itemsToRemove);
                logger.info(`Removed ${itemsToRemove.length} cart items that were not in the update list`);
            }

            logger.info(`Updated ${updatedCartItems.length} influencer items in cart ID: ${cart.id}`);

            /** ✅ Step 6: Recalculate & Update `totalAmount` with Discount **/
            // Calculate subtotal (sum of all items)
            const subtotal = updatedCartItems.reduce((sum, item) => sum + Number(item.price) * (item.quantity ?? 1), 0);
            
            // Apply discount if provided (discount is a percentage)
            const discount = billingDetails.discount ?? 0;
            const discountAmount = discount > 0 ? (subtotal * discount) / 100 : 0;
            const calculatedTotalAmount = subtotal - discountAmount;
            
            billingDetails.totalAmount = calculatedTotalAmount;
            await transactionalEntityManager.save(billingDetails);
            await transactionalEntityManager.save(checkout);

            logger.info(`Updated totalAmount for checkout ID: ${checkoutId}, Subtotal: ${subtotal}, Discount: ${discount}%, Discount Amount: ${discountAmount}, New Total: ${calculatedTotalAmount}`);
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
                subtotal,
                discount: discount,
                discountAmount,
                calculatedTotalAmount,
                email: user?.email,
            };

        } catch (error: any) {
            logger.error(`Error editing proposal: ${error.message}`);
            throw new Error(`Failed to edit proposal: ${error.message}`);
        }
    });
};

// Service function for deleting a proposal
export const deleteProposal = async (checkoutId: string) => {
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


            /** Step 2: Fetch BillingDetails Separately **/
            const billingDetails = await transactionalEntityManager.findOne(BillingDetails, {
                where: { checkout: { id: checkoutId } },
            });

            if (!billingDetails) throw new Error(`BillingDetails not found for checkout ID: ${checkoutId}`);

            /** Step 3: Validate deletion conditions **/
            // Check if proposal is already approved
            if (billingDetails.proposalStatus === 'approved') {
                throw new Error(`Cannot delete a proposal which is already approved (checkout ID: ${checkoutId})`);
            }
            
            // Check if invoice is already generated
            if (billingDetails.invoiceStatus === 'generated') {
                throw new Error(`Cannot delete a proposal whose invoice is generated (checkout ID: ${checkoutId})`);
            }

            /** Step 4: Delete related InfluencerCartItems first (to maintain referential integrity) **/
            await transactionalEntityManager.delete(InfluencerCartItem, { cart: { id: cart.id } });
            logger.info(`Removed influencer cart items for cart ID: ${cart.id}`);

            /** Step 5: Delete BillingDetails **/
            await transactionalEntityManager.delete(BillingDetails, { id: billingDetails.id });
            logger.info(`Deleted BillingDetails for checkout ID: ${checkoutId}`);

            /** Step 6: Delete ProposalToken if exists (to avoid foreign key constraint) **/
            const { ProposalToken } = await import('../../../entity/proposalToken/ProposalToken.entity');
            await transactionalEntityManager.delete(ProposalToken, { cart: { id: cart.id } });
            logger.info(`Deleted ProposalToken for cart ID: ${cart.id}`);

            /** Step 7: Delete Checkout **/
            await transactionalEntityManager.delete(Checkout, { id: checkoutId });
            logger.info(`Deleted Checkout with ID: ${checkoutId}`);

            /** Step 8: Delete Cart **/
            await transactionalEntityManager.delete(Cart, { id: cart.id });
            logger.info(`Deleted Cart with ID: ${cart.id}`);

            return {
                message: 'Proposal deleted successfully',
                deletedCheckoutId: checkoutId,
            };

        } catch (error: any) {
            logger.error(`Error deleting proposal: ${error.message}`);
            throw new Error(`Failed to delete proposal: ${error.message}`);
        }
    });
};

interface InvoiceData {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    balanceDue: string;
    companyName: string;
    companyAddress: string;
    companyEmail: string;
    clientName: string;
    clientAddress: string;
    items: InvoiceItem[];
    subtotal: string;
    managementFee: string;
    managementFeePercentage: number;
    airdropFee: string;
    notes: string;
    terms_and_conditions: string;
    hasNotes:boolean
}

interface InvoiceItem {
    index: number;
    name: string;
    platform: string;
    contentType: string;
    price: string;
}
// take another param for  managemnt fee
function extractInvoiceData(
    apiData: any,
    managementFeePercentage: number,
    terms_and_conditions: string,
): InvoiceData {
    const invoiceDate = new Date(apiData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
    const dueDate = new Date(apiData.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
    const formattedInvoiceNo = `INV-${apiData.id.slice(-4)}`; // last four digits of checkout id
    const airdropFee = parseFloat(apiData.totalAmount) * 0.05;
    const managementFee =
        (parseFloat(apiData.totalAmount) * managementFeePercentage) / 100 ||
        parseFloat(apiData.totalAmount) * 0.05; //  take from argument managementFeePercentage or fallback to 5


    // sort infleuncer in descending order of how3 score
     const influencers = apiData.cart?.influencerCartItems.sort(
         (a:any, b:any) => b?.influencer?.tweetScoutScore - a?.influencer?.tweetScoutScore,
     );    
    // Extract influencer items with notes
    const items =
        influencers?.map((item: any, index: number) => ({
            index: index + 1,
            name: item.influencer?.name || 'Unknown Influencer',
            platform: item.influencer?.platform || 'Unknown',
            contentType: item.influencer?.contentType || 'Unknown',
            price: item.price || item?.influencer?.price, // fallback to influencer price
            notes: item.note || '', // Include the notes for each influencer
        })) || [];

    // Check if any influencer has notes
    const hasNotes = items.some((item:any) => item.notes && item.notes.trim() !== '');

    return {
        invoiceNumber: formattedInvoiceNo,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        balanceDue: (
            Number(apiData.totalAmount) +
            // Number(airdropFee) +
            Number(managementFee)
        ).toFixed(2), // sum post all fees
        // Hardcoded Company Details
        companyName: 'HOW3 Pte. Ltd.',
        companyAddress: '68 CIRCULAR ROAD #02-01, Singapore 049422',
        companyEmail: 'finance@houseofweb3.com',

        // Client Details
        clientName: apiData.cart?.user?.fullname || 'Unknown Client',
        clientAddress: formatClientAddress(apiData.cart?.user?.addressInfo),

        // Items with notes
        items: items,
        hasNotes: hasNotes,

        // Summary Calculations
        subtotal: apiData.totalAmount || '0.00',
        managementFee: managementFee.toFixed(2),
        airdropFee: airdropFee.toFixed(2),
        managementFeePercentage: managementFeePercentage || 5, // fallback to 5% management fee

        // Payment Information and Notes
        terms_and_conditions: terms_and_conditions,
        notes: 'Payments are final. No refunds or adjustments after confirmation.',
    };
}

// Generate invoice details for a given checkoutId and store it to s3 and billing details
export const generateInvoicePdf = async (
    checkoutId: string,
    terms_and_conditions:string
) => {
    const checkoutRepository = AppDataSource.getRepository(Checkout);
    const billingDetailsRepository = AppDataSource.getRepository(BillingDetails)

    try {
        // ✅ Find BillingDetails by checkoutId (since Checkout does not have a direct reference)
        const billingData = await billingDetailsRepository.findOne({
            where: { checkout: { id: checkoutId } }
        });

        if (!billingData) {
            throw new Error(`No billing details found for checkout ID: ${checkoutId}`);
        }
        // Fetch cart by id
        logger.info(`Fetching cart with id: ${checkoutId}`);
        const data = await checkoutRepository.findOne({
            where: { id: checkoutId },
            relations: [
                'cart',
                'cart.user',
                'cart.influencerCartItems',
                'cart.influencerCartItems.influencer'
            ],
        });

        if (!data) {
            throw new Error(`No record found for id: ${checkoutId}`);
        }

        const templatePath = resolve(__dirname, '../../../templates/invoiceTemplate3.0.ejs');
        const templateContent = await fs.readFile(templatePath, { encoding: 'utf8' });

        const finalInvoiceData = extractInvoiceData(data, billingData.managementFeePercentage || 5,terms_and_conditions);
        const renderedHTML = ejs.render(templateContent, finalInvoiceData);

        const pdfBuffer = await convertHtmlToPdfBuffer(renderedHTML as string);

        const BUCKET_NAME = "ampli5";
        const fileKey = `invoices/${finalInvoiceData?.invoiceNumber}.pdf`;


        // ✅ Upload PDF to S3 and get URL
        const s3PublicUrl = await uploadPdfToS3(pdfBuffer, BUCKET_NAME, fileKey);


        // ✅ Update BillingDetails with the generated invoice link
        await billingDetailsRepository.update(billingData.id, {
            invoiceS3Link: s3PublicUrl,
            invoiceDate: new Date(),
            invoiceNo: finalInvoiceData?.invoiceNumber,
            invoiceStatus: "generated"
        });


        return { message: "Invoice stored to S3", invoiceUrl: s3PublicUrl };

    } catch (error: any) {
        logger.error(`Error generating invoice: ${error.message}`);
        throw new Error(`Failed to generate invoice: ${error.message}`);
    }
};


export const sendInvoiceEmailService = async (checkoutId: string) => {
    const checkoutRepository = AppDataSource.getRepository(Checkout);
    const billingDetailsRepository = AppDataSource.getRepository(BillingDetails)
    // ✅ Find BillingDetails by checkoutId (since Checkout does not have a direct reference)
    try {
        const billingData = await billingDetailsRepository.findOne({
            where: { checkout: { id: checkoutId } }
        });

        if (!billingData) {
            throw new Error(`No billing details found for checkout ID: ${checkoutId}`);
        }

        // Fetch cart by id
        logger.info(`Fetching cart with id: ${checkoutId}`);
        const data = await checkoutRepository.findOne({
            where: { id: checkoutId },
            relations: [
                'cart',
                'cart.user'
            ],
        });

        if (!data) {
            throw new Error(`No record found for id: ${checkoutId}`);
        }

        const userData = data.cart.user

        if(!userData?.addressInfo) {
        throw new Error(`can not generate an invoice for client with no address`);
        }

        const username = billingData?.firstName || 'Valued Customer';

        const { emailText, emailHtml } = invoiceEmailInfo(username)

        const fileName = `Ampli5X${billingData?.invoiceNo || ""}.pdf`

        const s3Link = billingData?.invoiceS3Link

        const subject = `Invoice from ampli5.ai (HOW3 Pte LTD) for ${username}`;

        const additionalEmail = userData?.email;

        // Send the PDF buffer as an email attachment
        await sendInvoiceEmail(
            userData,
            undefined,  // No S3 link, so pass undefined instead of an empty string
            s3Link,
            additionalEmail,
            emailText,
            emailHtml,
            fileName,
            subject
        );
        return data;
    } catch (error: any) {
        logger.error(`Error generating invoice: ${error.message}`);
        throw new Error(`Failed to generate invoice: ${error.message}`);
    }
}


// Service
export const getDashboardDetails = async (timeRange: string) => {
    // const checkoutRepository = AppDataSource.getRepository(Checkout);
    const billingDetailsRepository = AppDataSource.getRepository(BillingDetails);

    // Calculate start date based on time range
    const currentDate = new Date();
    const startDate = getStartDateFromTimeRange(timeRange);
    
    // Placeholder for dashboard metrics
    const dashboardData = {
        generatedProposals: 0,
        acceptedProposals: 0,
        grossSales: 0,
        totalClientsConverted: 0,
        conversionRate: 0,
        avgTimeToCloseDealInMinutes: 0,
        graphData: {
            proposalGenerated: [] as {timestamp: number, value: number}[],
            proposalPaid: [] as {timestamp: number, value: number}[]
        }
    };

    try {
        // 2. Get total proposals generated with time range
        dashboardData.generatedProposals = await billingDetailsRepository.count({
            where: {
                createdAt: Between(startDate, currentDate)
            }
        });

        // 3. Get total accepted proposals with time range
        dashboardData.acceptedProposals = await billingDetailsRepository.count({
            where: {
                proposalStatus: 'approved',
                createdAt: Between(startDate, currentDate)
            }
        });

        // 4. Calculate gross sales (sum of totalAmount for completed payments)
        const completedPayments = await billingDetailsRepository.find({
            where: {
                invoiceStatus: 'paid',
                createdAt: Between(startDate, currentDate)
            },
            select: ['totalAmount']
        });
        
        dashboardData.grossSales = completedPayments.reduce((sum, item) => {
            return sum + Number(item.totalAmount || 0);
        }, 0);

        // 5. Get total converted clients with time range
        dashboardData.totalClientsConverted = await billingDetailsRepository.count({
            where: {
                invoiceStatus: 'paid',
                createdAt: Between(startDate, currentDate)
            }
        });

        // 6. Calculate conversion rate (Paid Invoices / Generated Proposals)
        if (dashboardData.generatedProposals > 0) {
            dashboardData.conversionRate = Math.round(
                (dashboardData.totalClientsConverted / dashboardData.generatedProposals) * 100
            );
        }

        // 7. Calculate average time to close deal for paid invoices
        const paidInvoices = await billingDetailsRepository.find({
            where: {
                invoiceStatus: 'paid',
                createdAt: Between(startDate, currentDate)
            },
            select: ['createdAt', 'updatedAt']
        });

        if (paidInvoices.length > 0) {
            let totalMinutes = 0;
            
            paidInvoices.forEach(invoice => {
                if (invoice.createdAt && invoice.updatedAt) {
                    const diffMs = invoice.updatedAt.getTime() - invoice.createdAt.getTime();
                    const diffMinutes = Math.floor(diffMs / 60000);
                    totalMinutes += diffMinutes;
                }
            });
            
            const avgMinutes = Math.round(totalMinutes / paidInvoices.length);
         
            
            dashboardData.avgTimeToCloseDealInMinutes = avgMinutes;
        }

        // 8. Calculate graph data for daily proposals and paid invoices
        const dateRange = getDatesInRange(startDate, currentDate);
        
        // Initialize empty data points for each day
        const proposalGeneratedMap = new Map();
        const proposalPaidMap = new Map();
        
        dateRange.forEach(date => {
            const timestamp = date.getTime();
            proposalGeneratedMap.set(timestamp, 0);
            proposalPaidMap.set(timestamp, 0);
        });
        
        // Get all proposals within date range
        const allProposals = await billingDetailsRepository.find({
            where: {
                createdAt: Between(startDate, currentDate)
            }
        });
        
        // Count proposals by date created
        allProposals.forEach(proposal => {
            if (proposal.createdAt) {
                const dateKey = getStartOfDay(proposal.createdAt).getTime();
                
                if (proposalGeneratedMap.has(dateKey)) {
                    proposalGeneratedMap.set(dateKey, proposalGeneratedMap.get(dateKey) + 1);
                }
                
                // If this proposal is paid, increment the paid count
                if (proposal.invoiceStatus === 'paid') {
                    if (proposalPaidMap.has(dateKey)) {
                        proposalPaidMap.set(dateKey, proposalPaidMap.get(dateKey) + 1);
                    }
                }
            }
        });
        
        // Convert maps to arrays
        dashboardData.graphData.proposalGenerated = Array.from(proposalGeneratedMap.entries())
            .map(([timestamp, value]) => ({ timestamp, value }))
            .sort((a, b) => a.timestamp - b.timestamp);
            
        dashboardData.graphData.proposalPaid = Array.from(proposalPaidMap.entries())
            .map(([timestamp, value]) => ({ timestamp, value }))
            .sort((a, b) => a.timestamp - b.timestamp);

        return dashboardData;
    } catch (error) {
        logger.error("Error fetching dashboard details:", error);
        throw new Error("Failed to fetch dashboard details");
    }
};
















