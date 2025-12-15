import { AppDataSource } from '../../../config/data-source';
import { Cart } from '../../../entity/cart';
import { DrCartItem } from '../../../entity/cart';
import { PackageCartItem } from '../../../entity/cart';
import logger from '../../../config/logger';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../../utils/communication/ses/emailSender';
import { renderFile } from 'ejs';
import { resolve } from 'path';
// Import transformDataPr - it's in the same file we created earlier
import { transformDataPr } from './invoiceServicePrTransform';

const proposalEmailInfo = (clientName: string) => {
    const proposalEmailText = `Dear ${clientName},

We are excited to present you with a comprehensive proposal for your influencer marketing campaign. Our team has carefully curated a selection of top-tier influencers and packages tailored to your project needs.

Please find the detailed proposal attached to this email. We believe this campaign will significantly amplify your brand's reach and engagement.

If you have any questions or would like to discuss the proposal in detail, please don't hesitate to reach out to us.

Best regards,
Ampli5 Team
`;

    const proposalEmailHtml = `
<p>Dear ${clientName},</p>

<p>We are excited to present you with a comprehensive proposal for your influencer marketing campaign. Our team has carefully curated a selection of top-tier influencers and packages tailored to your project needs.</p>

<p>Please find the detailed proposal attached to this email. We believe this campaign will significantly amplify your brand's reach and engagement.</p>

<p>If you have any questions or would like to discuss the proposal in detail, please don't hesitate to reach out to us.</p>

<p>Best regards,<br>
Ampli5 Team</p>
`;
    return { proposalEmailText, proposalEmailHtml };
};

export const fetchInvoiceDetailsPr = async (
    id: string,
    email: string,
    managementFeePercentage: number,
    totalAmount: number,
    discount: number,
    checkoutDetails: any,
) => {
    const cartRepository = AppDataSource.getRepository(Cart);
    const drCartItemRepository = AppDataSource.getRepository(DrCartItem);
    const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

    try {
        logger.info(`Fetching cart with id: ${id}`);
        const cart = await cartRepository.findOne({
            where: { id },
            relations: ['user', 'drCartItems', 'packageCartItems'],
        });

        if (!cart) {
            throw new Error(`No cart found for id: ${id}`);
        }

        const drCartItems = await drCartItemRepository.find({
            where: { cart: { id } },
            relations: ['dr'],
        });

        logger.info(`Fetched drCartItems: ${JSON.stringify(drCartItems)}`);

        const packageCartItems = await packageCartItemRepository.find({
            where: { cart: { id } },
            relations: ['package', 'package.packageItems'],
        });

        logger.info(`Fetched packageCartItems: ${JSON.stringify(packageCartItems)}`);

        const data = {
            user: cart.user, // Assuming Cart has a relation with User
            id: cart.id,
            drCartItems,
            packageCartItems,
            managementFeePercentage,
            totalAmount,
            discount,
        };

        const transformCartData = transformDataPr(data);

        // Generate HTML from EJS template using an absolute path
        const templatePath = resolve(__dirname, '../../../templates/invoiceTemplate2.0.ejs');
        logger.info('****** templatePath ****');
        logger.info(transformCartData);
        const html = await renderFile(templatePath, transformCartData);
        // logger.info('**** html ****');
        // logger.info(html);
        // Convert HTML content directly to PDF in memory
        const currentYear = new Date().getFullYear();
        const usernamePrefix = transformCartData?.user?.fullname.slice(0, 4).toLowerCase(); // First 4 characters of the username in lowercase
        const password = `${usernamePrefix}${currentYear}`; // Example: "john2024"
        console.log('password: ', password);

        const pdfBuffer = await convertHtmlToPdfBuffer(html as string);

        const username = checkoutDetails?.firstName || 'Valued Customer';

        const { proposalEmailText, proposalEmailHtml } = proposalEmailInfo(username);

        const fileName = `Ampli5X${checkoutDetails?.projectName || ''}.pdf`;

        const subject = 'Amplify Distribution with Ampli5 (Best Yapping Discovery tool)';

        const additionalEmail = email;

        // Send the PDF buffer as an email attachment
            await sendInvoiceEmail(
                transformCartData.user,
                pdfBuffer,
                undefined, // No S3 link, so pass undefined instead of an empty string
                additionalEmail,
                proposalEmailText,
                proposalEmailHtml,
                fileName,
                subject,
            );

        logger.info(`Invoice generated and email sent to user: ${email}`);
    } catch (error: any) {
        logger.error(`Error fetching invoice details: ${error.message}`);
        throw new Error(`Failed to fetch invoice details: ${error.message}`);
    }
};
