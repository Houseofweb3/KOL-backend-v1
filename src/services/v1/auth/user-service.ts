import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { User, UserType } from '../../../entity/auth/User.entity';
import { Cart } from '../../../entity/cart';
import { AppDataSource } from '../../../config/data-source';
import { generateAccessToken, generateRefreshToken } from '../../../middleware/auth';
import { create } from 'domain';

const jwtRefreshSecret = ENV.REFRESH_JWT_SECRET;

const userRepository = AppDataSource.getRepository(User);

interface JwtPayload {
    id: string;
    type: any;
}

export const createUser = async (email: string, password?: string, fullname?: string, type?: string) => {
    try {
        // Check if a user with the given email already exists
        const existingUser = await AppDataSource.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(User, {
                where: [{ email }],
            });

            if (user) {
                if (user.is_deleted) {
                    user.is_deleted = false;

                    await transactionalEntityManager.save(user);

                    logger.info(`User reactivated successfully: ${user.id}`);

                    return { user, message: 'User reactivated successfully' };
                } else {
                    logger.warn(`User already exists and is inactive: ${user.id}`);
                    throw new Error('User already exists and is inactive');
                }
            }

            // hash the password only if provided
            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

            // create the entity to store in the db
            const newUser = transactionalEntityManager.create(User, {
                email,
                password: hashedPassword,
                fullname,
                type,
                status: true,
            });

            // Generate token and refresh token
            const token = generateAccessToken({ id: newUser.id, type });
            const refreshToken = generateRefreshToken({ id: newUser.id, type });

            // save the entity in the db
            await transactionalEntityManager.save(newUser);

            logger.info(`User created successfully: ${newUser.id}`);
            return { user: newUser, message: 'User signup successfully', token, refreshToken };
        });

        return existingUser;

    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating user: ${error.message}`);
            throw new Error(`Error creating user: ${error.message}`);
        } else {
            logger.error('An unknown error occurred while creating the user');
            throw new Error('An unknown error occurred while creating the user');
        }
    }
};


// Login User
// TODO: recantor this later
export const loginUser = async (email: string, password: string, fullname: string = '', type: string = UserType.USER) => {
    try {
        // Find user by email
        let user = await AppDataSource.getRepository(User).findOne({
            where: [{ email }],
        });
        // Check if user exists
        if (!user) {
            // logger.warn(`User not found with email: ${email}`);
            // throw new Error('User not found');
            await createUser(email, password, fullname, type);
        }

        user = await AppDataSource.getRepository(User).findOne({
            where: [{ email }],
        });

        if (user) {
            // logger.warn(`User not found with email: ${email}`);
            // throw new Error('User not found');
            // Check if the user is active
            if (user.is_deleted) {
                logger.warn(`User is inactive: ${user.id}`);
                throw new Error('User is inactive');
            }

            // Verify the password
            const isPasswordValid = await bcrypt.compare(password, user.password || '');

            if (!isPasswordValid) {
                logger.warn(`Invalid password attempt for email: ${email}`);
                throw new Error('Invalid password');
            }

            // Generate token and refresh token
            const token = generateAccessToken({ id: user.id, type: user.userType });
            const refreshToken = generateRefreshToken({ id: user.id, type: user.userType });

            logger.info(`User logged in successfully: ${user.id}`);
            return { user, message: 'Login successful', token, refreshToken };
        }
        else {
            logger.error('An unknown error occurred while logging in the user');
            throw new Error('An unknown error occurred');
        }

    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error logging in user: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred while logging in the user');
            throw new Error('An unknown error occurred');
        }
    }
};


// Refresh User Token
export const refreshTokenService = async (refreshToken: string) => {
    try {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as JwtPayload;

        if (!decoded) {
            throw new Error('Invalid refresh token');
        }

        // Generate a new access token
        const newAccessToken = generateAccessToken({ id: decoded.id, type: decoded.type });

        logger.info(`Refresh token processed successfully for user: ${decoded.id}`);
        return { newAccessToken };

    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error refreshing token: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred while refreshing the token');
            throw new Error('An unknown error occurred');
        }
    }
};


// get user details by id
export const getUserDetailsById = async (id: string): Promise<User | null> => {
    try {
        const user = await userRepository.findOneBy({
            id
        });

        // If user is found, return User entity
        if (user) {
            return user;
        }

        // Return null if the user is not found
        return null;
    } catch (error) {
        logger.error(`Failed to get user details for id: ${id}`, error);
        throw new Error('Failed to get user details');
    }
};




export const getUserDetailsAndOrderHistoryById = async (userId: string): Promise<{ user: User | null, checkoutHistory: any[] }> => {
    try {
        const cartRepository = AppDataSource.getRepository(Cart);

        // Fetch the user
        const user = await userRepository.findOne({
            where: { id: userId }
        });

        if (!user) {
            return { user: null, checkoutHistory: [] };
        }

        // Fetch the user's carts with all related data
        const carts = await cartRepository.createQueryBuilder('cart')
            .leftJoinAndSelect('cart.user', 'user')
            .leftJoinAndSelect('cart.influencerCartItems', 'influencerCartItems')
            .leftJoinAndSelect('influencerCartItems.influencer', 'influencer')
            .leftJoinAndSelect('cart.packageCartItems', 'packageCartItems')
            .leftJoinAndSelect('packageCartItems.package', 'package')
            .leftJoinAndSelect('package.packageItems', 'packageItems')  // Join for packageItems
            .leftJoinAndSelect('cart.checkout', 'checkout')
            .where('cart.userId = :userId', { userId })
            .andWhere('checkout.id IS NOT NULL')
            .getMany();

        // Map the results to the desired format
        const checkoutHistory = carts.map(cart => ({
            cartId: cart.id,
            checkout: {
                createdAt: cart.checkout?.createdAt,
                updatedAt: cart.checkout?.updatedAt,
                id: cart.checkout?.id,
                totalAmount: cart.checkout?.totalAmount
            },
            influencerCartItems: cart.influencerCartItems.map(item => ({
                id: item.id,
                influencer: {
                    id: item.influencer.id,
                    name: item.influencer.name,
                    niche: item.influencer.niche,
                    categoryName: item.influencer.categoryName,
                    subscribers: item.influencer.subscribers,
                    geography: item.influencer.geography,
                    platform: item.influencer.platform,
                    price: item.influencer.price,
                    credibilityScore: item.influencer.credibilityScore,
                    engagementRate: item.influencer.engagementRate,
                    investorType: item.influencer.investorType
                }
            })),
            packageCartItems: cart.packageCartItems.map(item => ({
                id: item.id,
                package: {
                    id: item.package.id,
                    header: item.package.header,
                    cost: item.package.cost,
                    guaranteedFeatures: item.package.guaranteedFeatures,
                    packageItems: item.package.packageItems.map(pkgItem => ({
                        id: pkgItem.id,
                        media: pkgItem.media,
                        format: pkgItem.format,
                        monthlyTraffic: pkgItem.monthlyTraffic,
                        turnAroundTime: pkgItem.turnAroundTime
                    }))
                }
            }))
        }));

        return { user, checkoutHistory };
    } catch (error) {
        logger.error(`Failed to get user details and order history for user id: ${userId}`, error);
        throw new Error('Failed to get user details and order history');
    }
};







// Deactivate the user provided the id
export const deactivateUserById = async (id: string): Promise<void> => {
    try {
        // Use a transaction to ensure atomicity
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            // Fetch the user and ensure they are active
            const user = await transactionalEntityManager.findOne(User, {
                where: { id },
            });

            if (!user || !user.is_deleted) {
                throw new Error('User not found or already inactive');
            }

            // Deactivate the user
            user.is_deleted = false;
            await transactionalEntityManager.save(user);

            logger.info(`User with id ${id} deactivated successfully`);
        });
    } catch (error) {
        logger.error(`Failed to deactivate user with id: ${id}`, error);
        throw new Error('Failed to deactivate user');
    }
};
