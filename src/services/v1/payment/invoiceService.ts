import { resolve } from 'path';
import { renderFile } from 'ejs';
import pdftk from 'node-pdftk';
import crypto from 'crypto';

import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../../utils/communication/ses/emailSender';
import { Cart, InfluencerCartItem, PackageCartItem } from '../../../entity/cart';

// Retain transformData function as is

function generatePassword(): string {
    return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

// Retain the transformData function
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
        content_type: item.influencer.platform,
        price: item.influencer.price,
        socialMediaLink: item.influencer.socialMediaLink,
    }));

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
        .reduce((acc: number, item: any) => acc + parseFloat(item.influencer.price), 0)
        .toFixed(2);
    const packageSubtotal = data.packageCartItems
        .reduce((acc: number, item: any) => acc + parseFloat(item.package.cost), 0)
        .toFixed(2);
    const totalPrice = (parseFloat(influencerSubtotal) + parseFloat(packageSubtotal)).toFixed(2);
    const managementFee = data.managementFee;
    const totalPriceWithFee = data.totalAmount;

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
        discount: data.discount,
    };
}

// Updated fetchInvoiceDetails function
export const fetchInvoiceDetails = async (
    id: string,
    additionalEmail: string,
    managementFee: number,
    managementFeePercentage: number,
    totalAmount: number,
    discount: number,
) => {
    const cartRepository = AppDataSource.getRepository(Cart);
    const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
    const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

    try {
        logger.info(`Fetching cart with id: ${id}`);
        const cart = await cartRepository.findOne({
            where: { id },
            relations: ['user', 'influencerCartItems', 'packageCartItems', 'checkout'],
        });

        if (!cart) {
            throw new Error(`No cart found for id: ${id}`);
        }
        logger.info(`Fetched cart: ${JSON.stringify(cart)}`);

        const influencerCartItems = await influencerCartItemRepository.find({
            where: { cart: { id } },
            relations: ['influencer'],
        });

        const packageCartItems = await packageCartItemRepository.find({
            where: { cart: { id } },
            relations: ['package', 'package.packageItems'],
        });

        const data = {
            user: cart.user,
            id: cart.id,
            influencerCartItems,
            packageCartItems,
            managementFee,
            managementFeePercentage,
            totalAmount,
            discount,
        };

        const transformCartData = transformData(data);

        const templatePath = resolve(__dirname, '../../../templates/invoiceTemplate.ejs');
        const html = await renderFile(templatePath, transformCartData);

        const pdfBuffer = await convertHtmlToPdfBuffer(html as string);

        const password = generatePassword();

        // Protect PDF using node-pdftk
        const protectedPdfBuffer = await pdftk
            .input(pdfBuffer)
            .encrypt128Bit()
            .userPw(password) // Set the user password
            .ownerPw(password) // Set the owner password
            .allow('Printing') // Allow specific permissions like printing
            .output();

        await sendInvoiceEmail(transformCartData.user, protectedPdfBuffer, password, additionalEmail);

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
            logger.error('Unknown error occurred while fetching invoice details');
            throw new Error('Unknown error occurred while fetching invoice details');
        }
    }
};