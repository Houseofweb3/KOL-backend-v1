import { AppDataSource } from '../data-source';
import { CheckoutDetails } from '../entity/CheckoutDetails';
import { UserCheckoutInfluencer } from '../entity/UserCheckoutInfluencer';
import { UserCheckoutPackages } from '../entity/UserCheckoutPackages';
import { InfluencerPR } from '../entity/InfluencerPR';
import { PackageHeader } from '../entity/PackageHeader';
import { Packages } from '../entity/Packages';
import { User } from '../entity/User'; // Import the User entity
import ejs from 'ejs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { convertHtmlToPdf } from '../utils/pdfGenerator';
import { sendInvoiceEmail } from '../utils/emailSender'; // Import the email sender utility

export const fetchInvoiceDetails = async (user_id: string) => {
  const checkoutDetailsRepository = AppDataSource.getRepository(CheckoutDetails);
  const userRepository = AppDataSource.getRepository(User); // Add userRepository to fetch user details
  const userCheckoutInfluencerRepository = AppDataSource.getRepository(UserCheckoutInfluencer);
  const userCheckoutPackagesRepository = AppDataSource.getRepository(UserCheckoutPackages);
  const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
  const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
  const packagesRepository = AppDataSource.getRepository(Packages);

  const checkoutDetails = await checkoutDetailsRepository.findOne({ 
    where: { user_id },
    select: ['projectName', 'projectURL', 'firstName', 'lastName', 'email', 'link']
  });

  if (!checkoutDetails) {
    return null;
  }

  const user = await userRepository.findOne({ where: { id: user_id } }); // Fetch user details
  if (!user) {
    throw new Error('User not found');
  }

  const userCheckoutInfluencers = await userCheckoutInfluencerRepository.find({ 
    where: { user_id }
  });

  const userCheckoutPackages = await userCheckoutPackagesRepository.find({ 
    where: { user_id }
  });

  // Fetch InfluencerPR details
  const influencerPRs = await Promise.all(userCheckoutInfluencers.map(async (influencer) => {
    const pr = await influencerPRRepository.findOne({ where: { id: influencer.influencers_id } });
    if (pr) {
      const { name, category_name, subscribers, price, content_type } = pr;
      return { name, category_name, subscribers, price, content_type };
    }
  }));

  // Fetch PackageHeader details and include their respective Packages
  const packageHeaders = await Promise.all(userCheckoutPackages.map(async (pkg) => {
    const header = await packageHeaderRepository.findOne({ 
      where: { id: pkg.packages_id },
      relations: ['packages']
    });
    if (header) {
      const { id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = header;
      
      // Fetch and process packages
      const packages = await packagesRepository.find({ where: { packageHeaderId: header.id } });
      const processedPackages = packages.map(pkg => {
        const { id, createdBy, updatedBy, createdAt, updatedAt, ...rest } = pkg;
        return rest;
      });

      return { ...rest, packages: processedPackages };
    }
  }));

  const data = {
    checkoutDetails,
    influencerPRs: influencerPRs.filter(pr => pr), // Filter out any undefined values
    packageHeaders: packageHeaders.filter(header => header) // Filter out any undefined values
  };

  // Generate HTML and save to file
  const html = await ejs.renderFile(join(__dirname, '../templates/invoiceTemplate.ejs'), data);
  const fileName = `HOW3x${checkoutDetails.firstName} ${checkoutDetails.lastName}`;
  const htmlFilePath = join(__dirname, '../invoices', `${fileName}.html`);
  writeFileSync(htmlFilePath, html);

  // Convert HTML to PDF
  const pdfFilePath = join(__dirname, '../invoices', `${fileName}.pdf`);
  await convertHtmlToPdf(htmlFilePath, pdfFilePath);

  // Send the PDF to the user's email
  await sendInvoiceEmail(user, pdfFilePath);

  return { data, filePath: pdfFilePath };
};
