// import { AppDataSource } from '../../config/data-source';
// import ejs from 'ejs';
// import { writeFileSync } from 'fs';
// import { join } from 'path';
// import { convertHtmlToPdf } from '../../utils/pdfGenerator';
// import { sendInvoiceEmail } from '../../utils/communication/ses/emailSender';
// import logger from '../../config/logger';
// import { Checkout } from '../../entity/checkout';

// const checkoutRepository = AppDataSource.getRepository(Checkout);

// export const fetchInvoiceDetails = async (id: string) => {

//     try {
//         const checkoutDetails = await checkoutRepository.findOne({
//             where: { id },
//         });


//         const data = {
//             checkoutDetails,
//             influencerPRs: influencerPRs.filter(pr => pr),
//             packageHeaders: packageHeaders.filter(header => header)
//         };

//         const html = await ejs.renderFile(join(__dirname, '../templates/invoiceTemplate.ejs'), data);
//         const fileName = `HOW3x${checkoutDetails.firstName} ${checkoutDetails.lastName}`;
//         const htmlFilePath = join(__dirname, '../invoices', `${fileName}.html`);
//         writeFileSync(htmlFilePath, html);

//         const pdfFilePath = join(__dirname, '../invoices', `${fileName}.pdf`);
//         await convertHtmlToPdf(htmlFilePath, pdfFilePath);

//         await sendInvoiceEmail(user, pdfFilePath);

//         logger.info(`Invoice generated and email sent to user: ${user_id}`);
//         return { data, filePath: pdfFilePath };
//     } catch (error: any) {
//         logger.error(`Error fetching invoice details for user_id: ${user_id}`, error);
//         throw new Error('Error fetching invoice details');
//     }
// };
