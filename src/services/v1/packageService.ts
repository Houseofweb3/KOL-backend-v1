import { Package } from '../../entity/package';
import { AppDataSource } from '../../config/data-source';
import logger from '../../config/logger';
import { ILike } from 'typeorm';

// Repository initialization
const packageRepository = AppDataSource.getRepository(Package);

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
