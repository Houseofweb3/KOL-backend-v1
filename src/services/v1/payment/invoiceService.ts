import { join } from 'path';
import { renderFile } from 'ejs';

import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { convertHtmlToPdfBuffer } from '../../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../../utils/communication/ses/emailSender';
import { Cart, InfluencerCartItem, PackageCartItem } from '../../../entity/cart';

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

    const influencerSubtotal = data.influencerCartItems.reduce((acc: number, item: any) => acc + parseFloat(item.influencer.price), 0).toFixed(2);
    const packageSubtotal = data.packageCartItems.reduce((acc: number, item: any) => acc + parseFloat(item.package.cost), 0).toFixed(2);
    const totalPrice = (parseFloat(influencerSubtotal) + parseFloat(packageSubtotal)).toFixed(2);
    const managementFee = (parseFloat(totalPrice) * 0.25).toFixed(2);
    const totalPriceWithFee = (parseFloat(totalPrice) + parseFloat(managementFee)).toFixed(2);

    return {
        user,
        checkoutDetails,
        influencerPRs,
        packageHeaders,
        influencerSubtotal,
        packageSubtotal,
        totalPrice,
        managementFee,
        totalPriceWithFee,
        showInfluencersList: influencerPRs.length > 0,
        showPackagesList: packageHeaders.length > 0
    };
}

export const fetchInvoiceDetails = async (id: string, userId?: string) => {
    const cartRepository = AppDataSource.getRepository(Cart);
    const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
    const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

    try {
        // Fetch cart by id
        logger.info(`Fetching cart with id: ${id}`);
        const cart = await cartRepository.findOne({ where: { id }, relations: ['user', 'influencerCartItems', 'packageCartItems', 'checkout'] });

        if (!cart) {
            throw new Error(`No cart found for id: ${id}`);
        }
        logger.info(`Fetched cart: ${JSON.stringify(cart)}`);

        // Fetch related influencerCartItems and packageCartItems
        logger.info(`Fetching influencerCartItems for cart id: ${id}`);
        
        const influencerCartItems = await influencerCartItemRepository.find({ where: { cart: { id } }, relations: ['influencer'] });
        logger.info(`Fetched influencerCartItems: ${JSON.stringify(influencerCartItems)}`);

        logger.info(`Fetching packageCartItems for cart id: ${id}`);
        const packageCartItems = await packageCartItemRepository.find({ where: { cart: { id } }, relations: ['package', 'package.packageItems'] });
        logger.info(`Fetched packageCartItems: ${JSON.stringify(packageCartItems)}`);

        const data = {
            user: cart.user,  // Assuming Cart has a relation with User
            id: cart.id,
            influencerCartItems,
            packageCartItems
        };

        const transformCartData = transformData(data);
        logger.info(`Transformed cart data: ${JSON.stringify(transformCartData)}`);

        // Generate HTML from EJS template
        const html = await renderFile(join(__dirname, '../../../src/templates/invoiceTemplate.ejs'), transformCartData);

        // Convert HTML content directly to PDF in memory
        const pdfBuffer = await convertHtmlToPdfBuffer(html as string);
        logger.info("generated html: ", pdfBuffer)


        // Send the PDF buffer as an email attachment
        await sendInvoiceEmail(transformCartData.user, pdfBuffer);
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
