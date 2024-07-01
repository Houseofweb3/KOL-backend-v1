import { AppDataSource } from '../data-source';
import { InfluencerPR } from '../entity/InfluencerPR';
import { User } from '../entity/User';
import { InfluencerCart } from '../entity/InfluencerCart';
import { PackageHeader } from '../entity/PackageHeader';
import { PackageCart } from '../entity/PackageCart';
import { v4 as uuidv4 } from 'uuid';

export const addProductToCartService = async (userId: string, influencerId: string) => {
  const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
  const userRepository = AppDataSource.getRepository(User);
  const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);

  const [product, user] = await Promise.all([
    influencerPRRepository.findOne({ where: { id: influencerId } }),
    userRepository.findOne({ where: { id: userId } }),
  ]);

  if (!product || !user || user.status !== 'active') {
    throw new Error('Product not found or user is not active');
  }

  const cartCount = await influencerCartRepository.count({
    where: { influencerPR: { id: influencerId }, user: { id: userId } },
  });

  if (cartCount >= 1) {
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
    throw new Error('User not found or not active');
  }

  if (!packageHeaderExists) {
    throw new Error('Package not found');
  }

  if (existingPackageCart) {
    throw new Error('Package is already in the cart 🙃');
  }

  const packageHeader = await packageHeaderRepository.findOne({ where: { id: packageId } });

  if (!packageHeader) {
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

  return 'Package added to cart successfully 👍';
};

export const getUserCartDetailsService = async (userId: string) => {
    const userRepository = AppDataSource.getRepository(User);
    const influencerCartRepository = AppDataSource.getRepository(InfluencerCart);
    const packageCartRepository = AppDataSource.getRepository(PackageCart);
  
    // Verify the user is active
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['status'],
    });
  
    if (!user || user.status !== 'active') {
      throw new Error('User not found or not active');
    }
  
    // Fetch influencer cart and package cart details
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
  
    return { influencerCart, packageCart };
  };