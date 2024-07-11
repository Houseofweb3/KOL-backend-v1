import { AppDataSource } from '../../config/data-source';
import { PackageItem } from '../../entity/package';
import logger from '../../config/logger';


const packageItemRepository = AppDataSource.getRepository(PackageItem);
// Create a new PackageItem
export const createPackageItem = async (
  media: string, 
  format: string, 
  monthlyTraffic: string, 
  turnAroundTime: string, 
  packageId: string
): Promise<PackageItem> => {
  try {
    const newPackageItem = packageItemRepository.create({
      media,
      format,
      monthlyTraffic,
      turnAroundTime,
      package: { id: packageId }
    });

    await packageItemRepository.save(newPackageItem);
    logger.info(`Created new package item with id ${newPackageItem.id}`);
    return newPackageItem;
  } catch (error) {
    logger.error(`Error creating package item: ${error}`);
    throw new Error('Error creating package item');
  }
};

// Update a PackageItem
export const updatePackageItem = async (
  id: string, 
  media?: string, 
  format?: string, 
  monthlyTraffic?: string, 
  turnAroundTime?: string, 
): Promise<PackageItem | null> => {
  try {
    const packageItem = await packageItemRepository.findOne({
      where: { id },
      relations: ['package'],
    });

    if (!packageItem) {
      throw new Error('PackageItem not found');
    }

    // Update fields if provided
    if (media) packageItem.media = media;
    if (format) packageItem.format = format;
    if (monthlyTraffic) packageItem.monthlyTraffic = monthlyTraffic;
    if (turnAroundTime) packageItem.turnAroundTime = turnAroundTime;

    await packageItemRepository.save(packageItem);
    logger.info(`Updated package item with id ${packageItem.id}`);
    return packageItem;
  } catch (error) {
    logger.error(`Error updating package item with id ${id}: ${error}`);
    throw new Error('Error updating package item');
  }
};

// Delete a PackageItem
export const deletePackageItem = async (id: string): Promise<void> => {
  try {
    await packageItemRepository.delete({ id });
    logger.info(`Deleted package item with id ${id}`);
  } catch (error) {
    logger.error(`Error deleting package item with id ${id}: ${error}`);
    throw new Error('Error deleting package item');
  }
};

// Get all PackageItems or get a PackageItem by ID
export const getPackageItems = async (id?: string): Promise<PackageItem | PackageItem[]> => {
  try {
    if (id) {
      // Fetch a single package item by ID
      const packageItem = await packageItemRepository.findOne({
        where: { id },
        relations: ['package'],  // Include related package
      });

      if (!packageItem) {
        throw new Error('PackageItem not found');
      }

      logger.info(`Fetched package item with id ${id}`);
      return packageItem;
    } else {
      // Fetch all package items
      const packageItems = await packageItemRepository.find({
        relations: ['package'],  // Include related package
      });

      logger.info('Fetched all package items');
      return packageItems;
    }
  } catch (error) {
    logger.error(`Error fetching package item(s): ${error}`);
    throw new Error('Error fetching package item(s)');
  }
};
