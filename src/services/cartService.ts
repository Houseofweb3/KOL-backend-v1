import { AppDataSource } from '../config/data-source';
import { InfluencerPR } from '../entity/InfluencerPR';
import { User } from '../entity/auth/User';
import { InfluencerCart } from '../entity/influencer/InfluencerCart';
import { PackageHeader } from '../entity/PackageHeader';
import { PackageCart } from '../entity/package/PackageCart';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export const addProductToCartService = async (userId: string, influencerId: string) => {
  const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
  const userRepository = AppDataSource.getRepository(User);
  const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);

  const [product, user] = await Promise.all([
    influencerPRRepository.findOne({ where: { id: influencerId } }),
    userRepository.findOne({ where: { id: userId } }),
  ]);

  if (!product || !user || user.status !== 'active') {
    logger.warn(`Product not found or user is not active: userId=${userId}, influencerId=${influencerId}`);
    throw new Error('Product not found or user is not active');
  }

  const cartCount = await influencerCartRepository.count({
    where: { influencerPR: { id: influencerId }, user: { id: userId } },
  });

  if (cartCount >= 1) {
    logger.warn(`User has reached the maximum number of times they can add this product to their cart: userId=${userId}, influencerId=${influencerId}`);
    throw new Error('You have reached the maximum number of times you can add this product to your cart');
  }

  const cart = influencerCartRepository.create({
    id: uuidv4(),
    influencerPR: { id: influencerId },
    user: { id: userId },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await influencerCartRepository.save(cart);
  logger.info(`Product added to cart: userId=${userId}, influencerId=${influencerId}`);

  return 'Product added to cart successfully 👍';
};

export const addPackageToCartService = async (userId: string, packageId: string) => {
  const userRepository = AppDataSource.getRepository(User);
  const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
  const packageCartRepository = AppDataSource.getRepository(PackageCart);

  const [user, packageHeaderExists, existingPackageCart] = await Promise.all([
    userRepository.findOne({ where: { id: userId }, select: ['status'] }),
    packageHeaderRepository.findOne({ where: { id: packageId }, select: ['id'] }),
    packageCartRepository.findOne({ where: { packageHeader: { id: packageId }, user: { id: userId } } }),
  ]);

  if (!user || user.status !== 'active') {
    logger.warn(`User not found or not active: userId=${userId}`);
    throw new Error('User not found or not active');
  }

  if (!packageHeaderExists) {
    logger.warn(`Package not found: packageId=${packageId}`);
    throw new Error('Package not found');
  }

  if (existingPackageCart) {
    logger.warn(`Package is already in the cart: userId=${userId}, packageId=${packageId}`);
    throw new Error('Package is already in the cart 🙃');
  }

  const packageHeader = await packageHeaderRepository.findOne({ where: { id: packageId } });

  if (!packageHeader) {
    logger.error(`Package Header not found: packageId=${packageId}`);
    throw new Error('Package Header not found');
  }

  const packageCart = packageCartRepository.create({
    id: uuidv4(),
    packageHeader: packageHeader,
    user: { id: userId },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await packageCartRepository.save(packageCart);
  logger.info(`Package added to cart: userId=${userId}, packageId=${packageId}`);

  return 'Package added to cart successfully 👍';
};

export const getUserCartDetailsService = async (userId: string) => {
  const userRepository = AppDataSource.getRepository(User);
  const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);
  const packageCartRepository = AppDataSource.getRepository(PackageCart);

  const user = await userRepository.findOne({
    where: { id: userId },
    select: ['status'],
  });

  if (!user || user.status !== 'active') {
    logger.warn(`User not found or not active: userId=${userId}`);
    throw new Error('User not found or not active');
  }

  const [influencerCart, packageCart] = await Promise.all([
    influencerCartRepository.find({
      where: { user: { id: userId } },
      relations: ['influencerPR'],
    }),
    packageCartRepository.find({
      where: { user: { id: userId } },
      relations: ['packageHeader', 'packageHeader.packages'],
    }),
  ]);

  logger.info(`Fetched cart details for user: userId=${userId}`);
  return { influencerCart, packageCart };
};
