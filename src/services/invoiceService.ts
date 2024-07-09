// import { AppDataSource } from '../config/data-source';
// import { CheckoutDetails } from '../entity/CheckoutDetails';
// import { UserCheckoutInfluencer } from '../entity/checkout/UserCheckoutInfluencer.entity';
// import { UserCheckoutPackages } from '../entity/checkout/UserCheckoutPackages.entity';
// import { InfluencerPR } from '../entity/InfluencerPR';
// import { PackageHeader } from '../entity/PackageHeader';
// import { Packages } from '../entity/package/Packages';
// import { User } from '../entity/auth/User.entity'; 
// import ejs from 'ejs';
// import { writeFileSync } from 'fs';
// import { join } from 'path';
// import { convertHtmlToPdf } from '../utils/pdfGenerator';
// import { sendInvoiceEmail } from '../utils/emailSender'; 
// import logger from '../config/logger'; 

// export const fetchInvoiceDetails = async (user_id: string) => {
//   const checkoutDetailsRepository = AppDataSource.getRepository(CheckoutDetails);
//   const userRepository = AppDataSource.getRepository(User); 
//   const userCheckoutInfluencerRepository = AppDataSource.getRepository(UserCheckoutInfluencer);
//   const userCheckoutPackagesRepository = AppDataSource.getRepository(UserCheckoutPackages);
//   const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
//   const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
//   const packagesRepository = AppDataSource.getRepository(Packages);

//   try {
//     const checkoutDetails = await checkoutDetailsRepository.findOne({
//       where: { user_id },
//       select: ['projectName', 'projectURL', 'firstName', 'lastName', 'email', 'link']
//     });

//     if (!checkoutDetails) {
//       logger.info(`Checkout details not found for user_id: ${user_id}`);
//       return null;
//     }

//     const user = await userRepository.findOne({ where: { id: user_id } });
//     if (!user) {
//       logger.warn(`User not found for user_id: ${user_id}`);
//       throw new Error('User not found');
//     }

//     const userCheckoutInfluencers = await userCheckoutInfluencerRepository.find({
//       where: { user_id }
//     });

//     const userCheckoutPackages = await userCheckoutPackagesRepository.find({
//       where: { user_id }
//     });

//     const influencerPRs = await Promise.all(userCheckoutInfluencers.map(async (influencer) => {
//       const pr = await influencerPRRepository.findOne({ where: { id: influencer.influencers_id } });
//       if (pr) {
//         const { name, category_name, subscribers, price, content_type } = pr;
//         return { name, category_name, subscribers, price, content_type };
//       }
//     }));

//     const packageHeaders = await Promise.all(userCheckoutPackages.map(async (pkg) => {
//       const header = await packageHeaderRepository.findOne({
//         where: { id: pkg.packages_id },
//         relations: ['packages']
//       });
//       if (header) {
//         const { id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = header;

//         const packages = await packagesRepository.find({ where: { packageHeaderId: header.id } });
//         const processedPackages = packages.map(pkg => {
//           const { id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = pkg;
//           return rest;
//         });

//         return { ...rest, packages: processedPackages };
//       }
//     }));

//     const data = {
//       checkoutDetails,
//       influencerPRs: influencerPRs.filter(pr => pr),
//       packageHeaders: packageHeaders.filter(header => header)
//     };

//     const html = await ejs.renderFile(join(__dirname, '../templates/invoiceTemplate.ejs'), data);
//     const fileName = `HOW3x${checkoutDetails.firstName} ${checkoutDetails.lastName}`;
//     const htmlFilePath = join(__dirname, '../invoices', `${fileName}.html`);
//     writeFileSync(htmlFilePath, html);

//     const pdfFilePath = join(__dirname, '../invoices', `${fileName}.pdf`);
//     await convertHtmlToPdf(htmlFilePath, pdfFilePath);

//     await sendInvoiceEmail(user, pdfFilePath);

//     logger.info(`Invoice generated and email sent to user: ${user_id}`);
//     return { data, filePath: pdfFilePath };
//   } catch (error: any) {
//     logger.error(`Error fetching invoice details for user_id: ${user_id}`, error);
//     throw new Error('Error fetching invoice details');
//   }
// };
