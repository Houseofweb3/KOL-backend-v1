import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { DrCartItem } from '../../../entity/cart/DrCartItem.entity';
import { CheckoutPr } from '../../../entity/checkoutPr';
import { BillingDetailsPr } from '../../../entity/billingDetailsPr';
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
 * Service function to create a proposal-pr.
 * @param userId - ID of the user creating the proposal.
 * @param billingInfo - Billing details payload.
 * @param drItems - List of DR items and their pricing.
 * @returns Newly created checkout-pr and billing details.
 */
export const createProposalPr = async (
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
    drItems: { drId: string; price: number }[]
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

            /** ✅ Step 2: Add DR Cart Items **/
            const drCartItems = drItems.map((item) => {
                const cartItem = new DrCartItem();
                cartItem.cart = cart;
                cartItem.dr = { id: item.drId } as any; // Assign DR by ID
                cartItem.price = item.price;
                return cartItem;
            });

            await transactionalEntityManager.save(drCartItems);
            logger.info(`Added ${drCartItems.length} DR items to cart: ${cart.id}`);

            /** ✅ Step 3: Create a CheckoutPr Entry **/
            const totalAmount = drCartItems.reduce((sum, item) => sum + item.price, 0);
            const checkoutPr = new CheckoutPr();
            checkoutPr.cart = cart;
            checkoutPr.totalAmount = totalAmount;

            await transactionalEntityManager.save(checkoutPr);
            logger.info(`CheckoutPr created with ID: ${checkoutPr.id}, Total Amount: ${totalAmount}`);

            /** ✅ Step 4: Save BillingDetailsPr **/
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
                message: 'Proposal-pr created successfully',
                checkoutPrId: checkoutPr.id,
                checkoutDetails,
                cartId: savedCart.id,
                billingDetailsPrId: billingDetailsPr.id,
                totalAmount,
                email: user.email,
            };
        } catch (error: any) {
            logger.error(`Error creating proposal-pr: ${error.message}`);
            throw new Error(`Failed to create proposal-pr: ${error.message}`);
        }
    });
};


// write a fn to get the invoice details provided jst checkoutPr ID  or billing details, get billing details, its associated cart, from cart get DR cart items
export const getProposalPrDetails = async (checkoutPrId: string) => {
    try {
        // Fetch cart by checkoutPr ID
        const checkoutPrRes = await AppDataSource.getRepository(CheckoutPr).findOne({
            where: { id: checkoutPrId },
            relations: ['cart', 'cart.drCartItems', 'cart.drCartItems.dr', 'cart.user'],
        });

        // fetch billing details from checkoutPr
        const billingDetailsPr = await AppDataSource.getRepository(BillingDetailsPr).findOne({
            where: { checkoutPr: { id: checkoutPrId } },
        });

        let checkoutPr;

        // add the billing details to the checkoutPr object
        if (checkoutPrRes) {
            checkoutPr = {
                ...checkoutPrRes,
                billingDetailsPr,
            }
        }

        if (!checkoutPr) {
            throw new Error(`No checkoutPr found for id: ${checkoutPrId}`);
        }
        return {
            checkoutPr
        };
    } catch (error: any) {
        logger.error(`Error fetching invoice details: ${error.message}`);
        throw new Error(`Failed to fetch invoice details: ${error.message}`);
    }
};


// Edit proposal-pr
export const editProposalPr = async (
    checkoutPrId: string,
    updatedBillingInfo: {
        managementFeePercentage?: number | 0,
        proposalStatus?: string,
        invoiceStatus?: string,
        paymentStatus?: string,
    },
    updatedDrItems: { drId: string; price: number, note?: string, }[]
) => {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
        try {
            /** ✅ Step 1: Fetch CheckoutPr & Related Entities **/
            const checkoutPr = await transactionalEntityManager.findOne(CheckoutPr, {
                where: { id: checkoutPrId },
                relations: ['cart', 'cart.drCartItems', 'cart.user'], // ✅ No "billingDetailsPr" in relations
            });

            if (!checkoutPr) throw new Error(`CheckoutPr not found for ID: ${checkoutPrId}`);
            const cart = checkoutPr.cart;
            if (!cart) throw new Error(`Cart not found for checkoutPr ID: ${checkoutPrId}`);

            // take the user from the cart
            const user = cart.user;

            /** ✅ Step 2: Fetch `BillingDetailsPr` Separately **/
            const billingDetailsPr = await transactionalEntityManager.findOne(BillingDetailsPr, {
                where: { checkoutPr: { id: checkoutPrId } }, // ✅ Fetch `BillingDetailsPr` using `checkoutPrId`
            });

            if (!billingDetailsPr) throw new Error(`BillingDetailsPr not found for checkoutPr ID: ${checkoutPrId}`);


            /** ✅ Step 3: Update Billing Details (Only if provided) **/
            Object.assign(billingDetailsPr, {
                managementFeePercentage: updatedBillingInfo.managementFeePercentage ?? billingDetailsPr.managementFeePercentage,
                proposalStatus: updatedBillingInfo.proposalStatus ?? billingDetailsPr.proposalStatus,
                invoiceStatus: updatedBillingInfo.invoiceStatus ?? billingDetailsPr.invoiceStatus,
                paymentStatus: updatedBillingInfo.paymentStatus ?? billingDetailsPr.paymentStatus,
            });

            await transactionalEntityManager.save(billingDetailsPr);
            logger.info(`Updated BillingDetailsPr for checkoutPr ID: ${checkoutPrId}`);

            /** ✅ Step 4: Remove Existing DrCartItems **/
            await transactionalEntityManager.delete(DrCartItem, { cart: { id: cart.id } });
            logger.info(`Removed existing DR cart items for cart ID: ${cart.id}`);

            /** ✅ Step 5: Add New DrCartItems **/
            const newDrCartItems = updatedDrItems.map((item) => {
                const cartItem = new DrCartItem();
                cartItem.cart = cart;
                cartItem.dr = { id: item.drId } as any;
                cartItem.price = item.price;
                cartItem.note = item.note;
                return cartItem;
            });

            await transactionalEntityManager.save(newDrCartItems);
            logger.info(`Added ${newDrCartItems.length} DR items to cart ID: ${cart.id}`);

            /** ✅ Step 6: Recalculate & Update `totalAmount` **/
            const calculatedTotalAmount = newDrCartItems.reduce((sum, item) => sum + item.price, 0);
            checkoutPr.totalAmount = calculatedTotalAmount;
            await transactionalEntityManager.save(checkoutPr);

            logger.info(`Updated totalAmount for checkoutPr ID: ${checkoutPrId}, New Total: ${checkoutPr.totalAmount}`);
            const checkoutDetails = {
                firstName: billingDetailsPr.firstName,
                lastName: billingDetailsPr.lastName,
                projectName: billingDetailsPr.projectName,
                telegramId: billingDetailsPr.telegramId,
                projectUrl: billingDetailsPr.projectUrl,
                // email: user.email,
                campaignLiveDate: billingDetailsPr.campaignLiveDate
            };


            return {
                message: 'Proposal-pr updated successfully',
                checkoutDetails,
                cartId: cart.id,
                calculatedTotalAmount,
                email: user?.email,
            };

        } catch (error: any) {
            logger.error(`Error editing proposal-pr: ${error.message}`);
            throw new Error(`Failed to edit proposal-pr: ${error.message}`);
        }
    });
};

// Service function for deleting a proposal-pr
export const deleteProposalPr = async (checkoutPrId: string) => {
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


            /** Step 2: Fetch BillingDetailsPr Separately **/
            const billingDetailsPr = await transactionalEntityManager.findOne(BillingDetailsPr, {
                where: { checkoutPr: { id: checkoutPrId } },
            });

            if (!billingDetailsPr) throw new Error(`BillingDetailsPr not found for checkoutPr ID: ${checkoutPrId}`);

            /** Step 3: Validate deletion conditions **/
            // Check if proposal is already approved
            if (billingDetailsPr.proposalStatus === 'approved') {
                throw new Error(`Cannot delete a proposal-pr which is already approved (checkoutPr ID: ${checkoutPrId})`);
            }
            
            // Check if invoice is already generated
            if (billingDetailsPr.invoiceStatus === 'generated') {
                throw new Error(`Cannot delete a proposal-pr whose invoice is generated (checkoutPr ID: ${checkoutPrId})`);
            }

            /** Step 4: Delete related DrCartItems first (to maintain referential integrity) **/
            await transactionalEntityManager.delete(DrCartItem, { cart: { id: cart.id } });
            logger.info(`Removed DR cart items for cart ID: ${cart.id}`);

            /** Step 5: Delete BillingDetailsPr **/
            await transactionalEntityManager.delete(BillingDetailsPr, { id: billingDetailsPr.id });
            logger.info(`Deleted BillingDetailsPr for checkoutPr ID: ${checkoutPrId}`);

            /** Step 6: Delete CheckoutPr **/
            await transactionalEntityManager.delete(CheckoutPr, { id: checkoutPrId });
            logger.info(`Deleted CheckoutPr with ID: ${checkoutPrId}`);

            /** Step 7: Delete Cart **/
            await transactionalEntityManager.delete(Cart, { id: cart.id });
            logger.info(`Deleted Cart with ID: ${cart.id}`);

            return {
                message: 'Proposal-pr deleted successfully',
                deletedCheckoutPrId: checkoutPrId,
            };

        } catch (error: any) {
            logger.error(`Error deleting proposal-pr: ${error.message}`);
            throw new Error(`Failed to delete proposal-pr: ${error.message}`);
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
    const formattedInvoiceNo = `INV-${apiData.id.slice(-4)}`; // last four digits of checkoutPr id
    const airdropFee = parseFloat(apiData.totalAmount) * 0.05;
    const managementFee =
        (parseFloat(apiData.totalAmount) * managementFeePercentage) / 100 ||
        parseFloat(apiData.totalAmount) * 0.05; //  take from argument managementFeePercentage or fallback to 5


    // Sort DR items by price (descending)
     const drItems = apiData.cart?.drCartItems.sort(
         (a:any, b:any) => parseFloat(b?.price || 0) - parseFloat(a?.price || 0),
     );    
    // Extract DR items with notes
    const items =
        drItems?.map((item: any, index: number) => ({
            index: index + 1,
            name: item.dr?.website || 'Unknown Website',
            platform: 'DR Service',
            contentType: `DR ${item.dr?.dr || 'N/A'}`,
            price: item.price || item?.dr?.price, // fallback to DR price
            notes: item.note || '', // Include the notes for each DR item
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

// Generate invoice details for a given checkoutPrId and store it to s3 and billing details
export const generateInvoicePdfPr = async (
    checkoutPrId: string,
    terms_and_conditions:string
) => {
    const checkoutPrRepository = AppDataSource.getRepository(CheckoutPr);
    const billingDetailsPrRepository = AppDataSource.getRepository(BillingDetailsPr)

    try {
        // ✅ Find BillingDetailsPr by checkoutPrId (since CheckoutPr does not have a direct reference)
        const billingData = await billingDetailsPrRepository.findOne({
            where: { checkoutPr: { id: checkoutPrId } }
        });

        if (!billingData) {
            throw new Error(`No billing details found for checkoutPr ID: ${checkoutPrId}`);
        }
        // Fetch cart by id
        logger.info(`Fetching cart with id: ${checkoutPrId}`);
        const data = await checkoutPrRepository.findOne({
            where: { id: checkoutPrId },
            relations: [
                'cart',
                'cart.user',
                'cart.drCartItems',
                'cart.drCartItems.dr'
            ],
        });

        if (!data) {
            throw new Error(`No record found for id: ${checkoutPrId}`);
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


        // ✅ Update BillingDetailsPr with the generated invoice link
        await billingDetailsPrRepository.update(billingData.id, {
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


export const sendInvoiceEmailServicePr = async (checkoutPrId: string) => {
    const checkoutPrRepository = AppDataSource.getRepository(CheckoutPr);
    const billingDetailsPrRepository = AppDataSource.getRepository(BillingDetailsPr)
    // ✅ Find BillingDetailsPr by checkoutPrId (since CheckoutPr does not have a direct reference)
    try {
        const billingData = await billingDetailsPrRepository.findOne({
            where: { checkoutPr: { id: checkoutPrId } }
        });

        if (!billingData) {
            throw new Error(`No billing details found for checkoutPr ID: ${checkoutPrId}`);
        }

        // Fetch cart by id
        logger.info(`Fetching cart with id: ${checkoutPrId}`);
        const data = await checkoutPrRepository.findOne({
            where: { id: checkoutPrId },
            relations: [
                'cart',
                'cart.user'
            ],
        });

        if (!data) {
            throw new Error(`No record found for id: ${checkoutPrId}`);
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

