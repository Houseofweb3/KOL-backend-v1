import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import csv from 'csv-parser';
import { Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { Admin } from '../entity/auth/Admin';
import { PackageHeader } from '../entity/PackageHeader';
import { Packages } from '../entity/package/Packages';
import logger from '../config/logger'; 

export const parseAndSaveCSV = async (filePath: string, adminId: string, res: Response) => {
  const results: any[] = [];

  try {
    const adminRepository = AppDataSource.getRepository(Admin);
    const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
    const packagesRepository = AppDataSource.getRepository(Packages);

    const admin = await adminRepository.findOne({ where: { id: adminId } });

    if (!admin || admin.status !== 'active') {
      logger.warn(`Admin not found or inactive: admin_id=${adminId}`);
      return res.status(403).json({ message: 'Admin not found or inactive.' });
    }

    const createdBy = admin.fullname ?? 'system';

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const row of results) {
          const {
            Header: header = 'N/A',
            Cost: cost = 'N/A',
            Text1: text1 = 'N/A',
            Text2: text2 = 'N/A',
            Text3: text3 = 'N/A',
            Text4: text4 = 'N/A',
            Text5: text5 = 'N/A',
            Text6: text6 = 'N/A',
            Text7: text7 = 'N/A',
            Media: media = 'N/A',
            Link: link = 'N/A',
            Format: format = 'N/A',
            'Monthly Traffic': monthlyTraffic = 'N/A',
            'Turnaround time': turnaroundTime = 'N/A'
          } = row;

          if (header === 'N/A' || cost === 'N/A') {
            logger.warn('Header and cost are required fields.');
            return res.status(400).json({ message: 'Header and cost are required fields.' });
          }

          let packageHeader = await packageHeaderRepository.findOne({ where: { header } });

          if (packageHeader) {
            if (packageHeader.text1 === text1 &&
                packageHeader.text2 === text2 &&
                packageHeader.text3 === text3 &&
                packageHeader.text4 === text4 &&
                packageHeader.text5 === text5 &&
                packageHeader.text6 === text6 &&
                packageHeader.text7 === text7 &&
                packageHeader.cost === cost) {
              logger.info(`Package header with ID ${packageHeader.id} already exists with matching data.`);
            } else {
              packageHeader = packageHeaderRepository.create({
                id: uuidv4(),
                header,
                cost,
                text1,
                text2,
                text3,
                text4,
                text5,
                text6,
                text7,
                createdBy,
                updatedBy: createdBy,
              });
              await packageHeaderRepository.save(packageHeader);
              logger.info(`Package header with ID ${packageHeader.id} created successfully.`);
            }
          } else {
            packageHeader = packageHeaderRepository.create({
              id: uuidv4(),
              header,
              cost,
              text1,
              text2,
              text3,
              text4,
              text5,
              text6,
              text7,
              createdBy,
              updatedBy: createdBy,
            });
            await packageHeaderRepository.save(packageHeader);
            logger.info(`Package header with ID ${packageHeader.id} created successfully.`);
          }

          const newPackage = packagesRepository.create({
            id: uuidv4(),
            media,
            link,
            format,
            monthlyTraffic,
            turnaroundTime,
            packageHeaderId: packageHeader.id,
            createdBy,
            updatedBy: createdBy,
          });
          await packagesRepository.save(newPackage);

          logger.info(`Package associated with header ${header} created successfully.`);
        }

        logger.info('CSV parsing and saving completed successfully.');
        return res.status(200).json({
          message: 'Package headers and associated packages have been created successfully.'
        });
      });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to read and parse CSV file:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

export const getPackageHeadersWithPackages = async () => {
  const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);

  try {
    const packageHeaders = await packageHeaderRepository.find({ relations: ['packages'] });
    logger.info('Fetched package headers and packages successfully.');
    return packageHeaders;
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to fetch package headers and packages:', err);
    throw new Error('Internal server error');
  }
};
