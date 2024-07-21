import { AppDataSource } from '../../config/data-source';
import ejs from 'ejs';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { convertHtmlToPdf } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/communication/ses/emailSender';
import logger from '../../config/logger';
import { Cart, InfluencerCartItem, PackageCartItem } from '../../entity/cart';
import { Checkout } from '../../entity/checkout';

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
    const checkoutRepository = AppDataSource.getRepository(Checkout);

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
        const html = await ejs.renderFile(join(__dirname, '../../templates/invoiceTemplate.ejs'), transformCartData);
        const fileName = `HOW3x_${transformCartData.checkoutDetails.firstName}_${transformCartData.checkoutDetails.lastName}`;
        const htmlFilePath = join(__dirname, '../../invoices', `${fileName}.html`);
        writeFileSync(htmlFilePath, html);
        logger.info(`Generated HTML file at: ${htmlFilePath}`);

        // Convert HTML to PDF and send email
        const pdfFilePath = join(__dirname, '../../invoices', `${fileName}.pdf`);
        await convertHtmlToPdf(htmlFilePath, pdfFilePath);
        logger.info(`Converted HTML to PDF at: ${pdfFilePath}`);
        await sendInvoiceEmail(transformCartData.user, pdfFilePath);
        logger.info(`Invoice generated and email sent to user: ${transformCartData.user.id}`);

        // Delete the HTML and PDF files
        unlinkSync(htmlFilePath);
        unlinkSync(pdfFilePath);
        logger.info(`Deleted temporary files`);

        // Ensure the fetched entities are properly handled
        if (cart && cart.influencerCartItems && cart.packageCartItems) {
            // First, delete the related Checkout entity if it exists
            if (cart.checkout) {
                await checkoutRepository.remove(cart.checkout);
                logger.info(`Deleted related checkout entity`);
            }

            // Delete related InfluencerCartItem and PackageCartItem entities
            await influencerCartItemRepository.remove(cart.influencerCartItems);
            await packageCartItemRepository.remove(cart.packageCartItems);
            logger.info(`Deleted related influencerCartItems and packageCartItems`);

            // Finally, delete the Cart entity
            await cartRepository.remove(cart);
            logger.info(`Deleted cart entity`);
        } else {
            throw new Error('Cart or related items not found or not properly loaded');
        }

        return { 
            data: transformCartData, 
            filePath: pdfFilePath, 
            influencerSubtotal: transformCartData.influencerSubtotal,
            packageSubtotal: transformCartData.packageSubtotal,
            totalPrice: transformCartData.totalPrice,
            managementFee: transformCartData.managementFee,
            totalPriceWithFee: transformCartData.totalPriceWithFee
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
