import { Package, PackageItem } from '../../entity/package';
import { AppDataSource } from '../../config/data-source';
import logger from '../../config/logger';
import { ILike } from 'typeorm';
import fs from 'fs';
import csv from 'csv-parser';

// Repository initialization
const packageRepository = AppDataSource.getRepository(Package);
const packageItemRepository = AppDataSource.getRepository(PackageItem);

export const createPackage = async (header: string, cost: number, guaranteedFeatures: string[]): Promise<Package> => {
  try {
    const newPackage = packageRepository.create({ header, cost, guaranteedFeatures });
    await packageRepository.save(newPackage);
    logger.info(`Package created successfully: ${newPackage.id}`);
    return newPackage;
  } catch (error) {
    logger.error(`Error creating package: ${error}`);
    throw new Error('Error creating package');
  }
};

export const getPackageById = async (id: string): Promise<Package | null> => {
  try {
    return await packageRepository.findOne({
      where: { id },
      relations: ['packageItems'],
    });
  } catch (error) {
    logger.error(`Error fetching package with id ${id}: ${error}`);
    throw new Error('Error fetching package');
  }
};

export const getAllPackages = async (
  page: number = 1,
  limit: number = 10,
  sortField: string = 'header',
  sortOrder: 'asc' | 'desc' = 'asc',
  searchTerm: string = ''  // Added searchTerm parameter
) => {
  const validSortFields = ['header', 'cost'];
  const order: { [key: string]: 'asc' | 'desc' } = validSortFields.includes(sortField)
    ? { [sortField]: sortOrder }
    : { header: sortOrder };

  // Construct the search criteria
  const searchCriteria: { [key: string]: any } = searchTerm
    ? {
      header: ILike(`%${searchTerm}%`) 
    }
    : {};

  const [packages, total] = await packageRepository.findAndCount({
    where: searchCriteria,  // Apply the search criteria
    order,
    take: limit,
    skip: (page - 1) * limit,
    relations: ['packageItems'],
  });

  logger.info(`Fetched packages for page ${page}, limit ${limit}, search term "${searchTerm}"`);

  return {
    packages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updatePackageById = async (id: string, updateData: Partial<Package>): Promise<Package | null> => {
  try {
    const packageToUpdate = await packageRepository.findOneBy({ id });
    if (!packageToUpdate) throw new Error('Package not found');

    Object.assign(packageToUpdate, updateData);
    await packageRepository.save(packageToUpdate);

    logger.info(`Package updated successfully: ${packageToUpdate.id}`);
    return packageToUpdate;
  } catch (error) {
    logger.error(`Error updating package with id ${id}: ${error}`);
    throw new Error('Error updating package');
  }
};

export const deletePackageById = async (id: string): Promise<void> => {
  try {
    await packageRepository.delete(id);
    logger.info(`Package deleted successfully: ${id}`);
  } catch (error) {
    logger.error(`Error deleting package with id ${id}: ${error}`);
    throw new Error('Error deleting package');
  }
};

// Parse and save CSV
export const parseAndSaveCSV = async (filePath: string): Promise<void> => {
  const results: any[] = [];

  return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', async () => {
              try {
                  for (const row of results) {
                      const {
                          Header: header = 'N/A',
                          Cost: cost = 'N/A',
                          Text1,
                          Text2,
                          Text3,
                          Text4,
                          Text5,
                          Text6,
                          Text7,
                          Media: media = 'N/A',
                          Format: format = 'N/A',
                          'Monthly Traffic': monthlyTraffic = 'N/A',
                          'Turnaround time': turnaroundTime = 'N/A'
                      } = row;

                      if (header === 'N/A' || cost === 'N/A') {
                          throw new Error('Header and cost are required fields.');
                      }

                      const guaranteedFeatures = [
                          Text1, Text2, Text3, Text4, Text5, Text6, Text7
                      ].filter(Boolean); // Filter out undefined or null values

                      let existingPackage = await packageRepository.findOne({
                          where: { header: header },
                      });

                      if (!existingPackage) {
                          existingPackage = packageRepository.create({
                              header,
                              cost: parseFloat(cost),
                              guaranteedFeatures,
                          });
                          await packageRepository.save(existingPackage);
                          logger.info(`Package created successfully: ${existingPackage.id}`);
                      } else {
                          logger.info(`Package with header ${header} already exists.`);
                      }

                      const newPackageItem = packageItemRepository.create({
                          media,
                          format,
                          monthlyTraffic,
                          turnAroundTime: turnaroundTime,
                          package: existingPackage,
                      });

                      await packageItemRepository.save(newPackageItem);

                      logger.info(`Package item associated with header ${header} created successfully.`);
                  }
                  resolve();
              logger.info(`Package details saved successfully`);

              } catch (error) {
                  logger.error('Failed to read and parse CSV file:', error);
                  reject(new Error('Failed to read and parse CSV file'));
              }
          })
          .on('error', (error) => {
              logger.error('Error reading CSV file:', error);
              reject(new Error('Error reading CSV file'));
          });
  });
};
