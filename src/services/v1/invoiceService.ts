import { AppDataSource } from '../../config/data-source';
import ejs from 'ejs';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { convertHtmlToPdf } from '../../utils/pdfGenerator';
// import { sendInvoiceEmail } from '../../utils/communication/ses/emailSender';
import logger from '../../config/logger';
import { getCarts } from './cartService';
import { Cart } from '../../entity/cart/Cart.entity';
import { InfluencerCartItem } from '../../entity/cart/InfluencerCartItem.entity';
import { PackageCartItem } from '../../entity/cart/PackageCartItem.entity';

function transformData(data: any) {
    // Extract the necessary data
    const checkoutDetails = {
        projectName: data.user.fullname,
        projectURL: `https://example.com/projects/${data.id}`,
        firstName: data.user.fullname.split(' ')[0],
        lastName: data.user.fullname.split(' ')[1] || '',
        email: data.user.email,
        link: `https://example.com/users/${data.user.id}`,
    };

    const user = data.user;

    // Map influencerCartItems to the format for the EJS template
    const influencerPRs = data.influencerCartItems.map((item: any) => ({
        name: item.influencer.name,
        category_name: item.influencer.categoryName,
        location: item.influencer.geography,
        subscribers: item.influencer.subscribers,
        content_type: item.influencer.platform,
        price: item.influencer.price,
    }));

    // Map packageCartItems to the format for the EJS template
    const packageHeaders = data.packageCartItems.map((item: any) => ({
        header: item.packageItem.media,
        cost: item.packageItem.price,
        packages: [{
            media: item.packageItem.media,
            link: `https://example.com/packages/${item.id}`,
            format: item.packageItem.format,
            monthlyTraffic: item.packageItem.monthlyTraffic,
            turnaroundTime: item.packageItem.turnAroundTime,
        }],
    }));

    return {
        user,
        checkoutDetails,
        influencerPRs,
        packageHeaders,
        subtotal: data.packageCartItems.reduce((acc: number, item: any) => acc + parseFloat(item.packageItem.price), 0).toFixed(2),
    };
}

export const fetchInvoiceDetails = async (id: string, userId: string) => {
    // const cartRepository = AppDataSource.getRepository(Cart);
    // const influencerCartItemRepository = AppDataSource.getRepository(InfluencerCartItem);
    // const packageCartItemRepository = AppDataSource.getRepository(PackageCartItem);

    try {
        // Fetch cart data from the repository
        const cartData = await getCarts(userId as string, id as string);

        // Check for null cartData and transform it if available
        if (!cartData || cartData.length === 0) {
            throw new Error(`No cart data found for id: ${id}`);
        }

        const transformCartData = transformData(cartData[0]);

        // Perform your operations with transformCartData
        const html = await ejs.renderFile(join(__dirname, '../../templates/invoiceTemplate.ejs'), transformCartData);
        console.log("HTML: ", html);

        const fileName = `HOW3x_${transformCartData.checkoutDetails.firstName}_${transformCartData.checkoutDetails.lastName}`;
        const htmlFilePath = join(__dirname, '../../invoices', `${fileName}.html`);
        writeFileSync(htmlFilePath, html);
        const pdfFilePath = join(__dirname, '../../invoices', `${fileName}.pdf`);
        await convertHtmlToPdf(htmlFilePath, pdfFilePath);
        // await sendInvoiceEmail(transformCartData.user, pdfFilePath);
        logger.info(`Invoice generated and email sent to user: ${transformCartData.user.id}`);

        // Delete the HTML and PDF files
        // unlinkSync(htmlFilePath);
        // unlinkSync(pdfFilePath);

        // Delete InfluencerCartItem, PackageCartItem and Cart
        // const cart = await cartRepository.findOne({ where: { id }, relations: ['influencerCartItems', 'packageCartItems'] });
        // if (cart) {
        //     await influencerCartItemRepository.remove(cart.influencerCartItems);
        //     await packageCartItemRepository.remove(cart.packageCartItems);
        //     await cartRepository.remove(cart);
        // } else {
        //     throw new Error('Cart not found');
        // }

        return { data: transformCartData, filePath: pdfFilePath };
  
    } catch (error) {
        logger.error(`Error fetching invoice details for id: ${id}`, error);
        throw new Error('Error fetching invoice details');
    }
};
