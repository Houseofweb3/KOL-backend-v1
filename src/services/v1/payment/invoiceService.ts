import { resolve } from 'path';
import { renderFile } from 'ejs';

import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../../utils/communication/ses/emailSender';
import { Cart, InfluencerCartItem, PackageCartItem } from '../../../entity/cart';

const proposalEmailInfo = (username: string) => {
    const proposalEmailText = `Hello ${username},

        We are happy to have you onboard.

        Attached, you will find the draft copy of the list.

        The attached PDF is password-protected. Please use the following password to open the file:

        Password: [First 4 characters of your username in lowercase][Current year]  
        Example: If your username is "JohnSmith", your password will be "john2024".

        Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours.

        Thank you for your patience and cooperation.

        Best regards,  
        Ampli5
        `
    const proposalEmailHtml = `<p>Hello ${username},</p>

        <p>We are happy to have you onboard.</p>

        <p>Attached, you will find the draft copy of the list.</p>

        <p><b>The attached PDF is password-protected. Please use the following password to open the file:</b></p>

        <p><b>Password:</b> [First 4 characters of your username in lowercase][Current year]</p>

        <p><b>Example:</b> If your username is "JohnSmith", your password will be "john2024".</p>

        <p>Our team is currently reviewing the list to ensure it meets our stringent quality standards. You can expect to receive the final list within the next 24 business hours.</p>

        <p>Thank you for your patience and cooperation.</p>

        <p>Best regards,</p>

        <p>Ampli5</p>
        `
    return { proposalEmailText, proposalEmailHtml }
}

function transformData(data: any) {
    const checkoutDetails = {
        projectName: data.user?.fullname || 'Unknown User',
        projectURL: `https://example.com/projects/${data.id}`,
        firstName: data.user?.fullname.split(' ')[0] || 'Unknown',
        lastName: data.user?.fullname.split(' ')[1] || '',
        email: data.user?.email || 'Unknown Email',
        link: data.user ? `https://example.com/users/${data.user.id}` : '',
    };

    const user = data.user || {};

    const influencerPRs = data.influencerCartItems.map((item: any) => ({
        name: item.influencer.name,
        category_name: item.influencer.categoryName,
        location: item.influencer.geography,
        subscribers: item.influencer.subscribers,
        platform: item.influencer.platform,
        contentType: item.influencer.contentType,
        price: item.price ? item.price : item.influencer.price,
        socialMediaLink: item.influencer.socialMediaLink,
        notes: item.note || '', // Ensure notes is always at least an empty string
    }));

    // Check if any influencer has notes
    const hasAnyNotes = influencerPRs.some(
        (influencer:any) => influencer.notes && influencer.notes.trim() !== '',
    );

    const packageHeaders = data.packageCartItems.map((item: any) => ({
        header: item.package.header,
        cost: item.package.cost,
        packages: item.package.packageItems.map((pkgItem: any) => ({
            media: pkgItem.media,
            link: `https://example.com/packages/${item.package.id}`,
            format: pkgItem.format,
            monthlyTraffic: pkgItem.monthlyTraffic,
            turnaroundTime: pkgItem.turnAroundTime,
        })),
    }));

    const influencerSubtotal = data.influencerCartItems
        .reduce((acc: number, item: any) => acc + parseFloat(item.price ? item.price : item.influencer.price), 0)
        .toFixed(2);
    const packageSubtotal = data.packageCartItems
        .reduce((acc: number, item: any) => acc + parseFloat(item.package.cost), 0)
        .toFixed(2);
    const totalPrice = (parseFloat(influencerSubtotal) + parseFloat(packageSubtotal)).toFixed(2);

    // calc management fee based on total amount
    const managementFee = (parseFloat(totalPrice) * (data.managementFeePercentage / 100)).toFixed(2);

const airDropFeePercentage = 5; // 5% airdrop fee

// Calculate the airdrop fee amount by
const airDropFee = (parseFloat(totalPrice) * airDropFeePercentage) / 100;

// Add the airdrop fee to the total price, then add the management fee
const totalPriceWithFee = (parseFloat(totalPrice) + airDropFee + parseFloat(managementFee)).toFixed(
    2,
);



    return {
        user,
        checkoutDetails,
        influencerPRs,
        packageHeaders,
        influencerSubtotal,
        packageSubtotal,
        totalPrice,
        managementFee,
        managementFeePercentage: data.managementFeePercentage,
        totalPriceWithFee,
        showInfluencersList: influencerPRs.length > 0,
        showPackagesList: packageHeaders.length > 0,
        airDropFeePercentage: airDropFeePercentage,
        influencerLength: influencerPRs.length,
        airDropFee,
        hasAnyNotes,
    };
}

export const fetchInvoiceDetails = async (
    id: string,
    additionalEmail: string,
    // managementFee: number,
    managementFeePercentage: number,
    totalAmount: number,
    discount: number,
    checkoutDetails?: any,
) => {
    const cartRepository = AppDataSource.getRepository(Cart);
    const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
    const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

    try {
        // Fetch cart by id
        logger.info(`Fetching cart with id: ${id}`);
        const cart = await cartRepository.findOne({
            where: { id },
            relations: ['user', 'influencerCartItems', 'packageCartItems', 'checkout'],
        });

        if (!cart) {
            throw new Error(`No cart found for id: ${id}`);
        }
        logger.info(`Fetched cart: ${JSON.stringify(cart)}`);

        // Fetch related influencerCartItems and packageCartItems
        logger.info(`Fetching influencerCartItems for cart id: ${id}`);

        const influencerCartItems = await influencerCartItemRepository.find({
            where: { cart: { id } },
            relations: ['influencer'],
        });

        logger.info(`Fetching packageCartItems for cart id: ${id}`);
        const packageCartItems = await packageCartItemRepository.find({
            where: { cart: { id } },
            relations: ['package', 'package.packageItems'],
        });
        logger.info(`Fetched packageCartItems: ${JSON.stringify(packageCartItems)}`);

        const data = {
            user: cart.user, // Assuming Cart has a relation with User
            id: cart.id,
            influencerCartItems,
            packageCartItems,
            // managementFee,
            managementFeePercentage,
            totalAmount,
            discount,
        };
        console.log("semndng mail transofrming dataa ")
        const transformCartData = transformData(data);

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
        console.log("password: ", password)

        const pdfBuffer = await convertHtmlToPdfBuffer(html as string, password as string);

        const username = checkoutDetails?.firstName || 'Valued Customer';

        const { proposalEmailText, proposalEmailHtml } = proposalEmailInfo(username)

        const fileName = `Ampli5X${checkoutDetails?.projectName || ""}.pdf`

        const subject = 'Amplify Distribution with Ampli5 (Best Yapping Discovery tool)'

        // Send the PDF buffer as an email attachment
        await sendInvoiceEmail(
            transformCartData.user,
            pdfBuffer,
            undefined,  // No S3 link, so pass undefined instead of an empty string
            additionalEmail,
            proposalEmailText,
            proposalEmailHtml,
            fileName,
            subject
        );

        logger.info(`Invoice generated and email sent to user: ${transformCartData.user.id}`);

        return {
            data: transformCartData,
        };
    } catch (error) {
        logger.error(`Error fetching invoice details for id: ${id}`, error);

        if (error instanceof Error) {
            logger.error(`Error message: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
            throw new Error('Error fetching invoice details');
        } else {
            // TODO: is there a better way to store the text that we are logging and using in exception?
            logger.error('Unknown error occurred while fetching invoice details');
            throw new Error('Unknown error occurred while fetching invoice details');
        }
    }
};
