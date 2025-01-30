import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { User, UserType } from '../../../entity/auth/User.entity';
import { Cart } from '../../../entity/cart';
import { AppDataSource } from '../../../config/data-source';
import { generateAccessToken, generateRefreshToken } from '../../../middleware/auth';
import { sendWelcomeEmail } from '../../../utils/communication/ses/emailSender';
import { create } from 'domain';
import { FindOperator, ILike } from 'typeorm';

const jwtRefreshSecret = ENV.REFRESH_JWT_SECRET;

const userRepository = AppDataSource.getRepository(User);

interface JwtPayload {
    id: string;
    type: any;
}

// List of domains that are allowed to bypass the 2-account restriction
const ALLOWED_DOMAINS = ['houseofweb3.com'];

const extractEmailDomain = (email: string): string | null => {
    return email.split("@")[1]?.toLowerCase() || null;
};

export const validateGmail = (email: string): void => {
    const emailDomain = extractEmailDomain(email);
    if (!emailDomain) {
        throw { status: HttpStatus.BAD_REQUEST, message: "Invalid email format" };
    }
    if (emailDomain === "gmail.com") {
        throw { status: HttpStatus.FORBIDDEN, message: "Gmail accounts are not allowed" };
    }
};

export const validateDomainLimit = async (email: string): Promise<void> => {
    const emailDomain = extractEmailDomain(email);
    if (!emailDomain) {
        throw { status: HttpStatus.BAD_REQUEST, message: "Invalid email format" };
    }

    // ✅ Skip domain limit check for ALLOWED_DOMAINS
    if (ALLOWED_DOMAINS.includes(emailDomain)) return;

    try {
        // Fetch count of users with the same domain from DB
        const userRepository = AppDataSource.getRepository(User);
        const domainCount = await userRepository.count({
            where: { email: Like(`%@${emailDomain}`) },
        });

        if (domainCount >= 2) {
            throw { status: HttpStatus.FORBIDDEN, message: "Only 2 accounts per domain are allowed" };
        }
    } catch (error: any) {
        if (error.status) throw error; // Pass custom errors forward
        logger.error(`Error validating domain limit: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "An unknown error occurred while validating the domain" };
    }
};

// export const validateEmail = async (email: string) => {
//     if (!email) {
//         throw { status: HttpStatus.BAD_REQUEST, message: 'Email is required' };
//     }

//     const emailDomain = email.split('@')[1]?.toLowerCase();

//     // 1️⃣ Block Gmail accounts
//     if (emailDomain === 'gmail.com') {
//         throw { status: HttpStatus.FORBIDDEN, message: 'Gmail accounts are not allowed' };
//     }

//     // 2️⃣ Check if the domain should bypass the limit
//     if (ALLOWED_DOMAINS.includes(emailDomain)) {
//         return; // ✅ Skip domain limit check
//     }

//     try {
//         // 3️⃣ Fetch count of users with the same domain from DB
//         const userRepository = AppDataSource.getRepository(User);
//         const domainCount = await userRepository.count({
//             where: { email: Like(`%@${emailDomain}`) }
//         });

//         if (domainCount >= 2) {
//             throw { status: HttpStatus.FORBIDDEN, message: 'Only 2 accounts per domain are allowed' };
//         }
//     } catch (error: any) {
//         if ((error as any).status) {
//             throw error; // Pass custom errors forward
//         }
//         logger.error(`Error creating user: ${(error as Error).message}`);
//         throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while creating the user' };
//     }
// };


export const createUser = async (email: string, password: string, fullname?: string, type?: string) => {
    try {
        // 🔹 Validate email before proceeding
        validateGmail(email);
        return await AppDataSource.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(User, { where: [{ email }] });

            if (user) {
                const token = generateAccessToken({ id: user.id, type });
                const refreshToken = generateRefreshToken({ id: user.id, type });
                // TODO: this can be replaced with deletedAt
                if (user.is_deleted) {
                    user.is_deleted = false;
                    await transactionalEntityManager.save(user);

                    logger.info(`User reactivated successfully: ${user.id}`);
                    // return { user, message: 'User reactivated successfully' };
                }
                // Verify the password
                const isPasswordValid = await bcrypt.compare(password, user.password || '');
                if (!isPasswordValid) {
                    logger.warn(`Invalid password attempt for email: ${email}`);
                    throw { status: HttpStatus.UNAUTHORIZED, message: 'Invalid password' };
                }
                // else {
                logger.warn(`User already exists and is active: ${user.id}`);
                return { user, message: 'User already exists. Logging it', token, refreshToken };
                // }
            }
            await validateDomainLimit(email);

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

            await transactionalEntityManager.save(newUser);

            logger.info(`User created successfully: ${newUser.id}`);
            await sendWelcomeEmail(email);

            return { user: newUser, message: 'User signup successfully', token, refreshToken };
        });

    } catch (error) {
        if ((error as any).status) {
            throw error; // Pass custom errors forward
        }

        logger.error(`Error creating user: ${(error as Error).message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while creating the user' };
    }
};



// Login User
// TODO: refactor this later
export const loginUser = async (
    email: string,
    password: string,
    fullname: string = '',
    type: string = UserType.USER
) => {
    try {
        // 🔹 Validate email before proceeding

        // Find user by email
        let user = await AppDataSource.getRepository(User).findOne({ where: [{ email }] });

        // Check if user exists, if not, create the user
        if (!user) {
            // logger.warn(`User not found with email: ${email}`);
            // throw new Error('User not found');
            await createUser(email, password, fullname, type);
        }

        // Fetch user again after potential creation
        user = await AppDataSource.getRepository(User).findOne({ where: [{ email }] });

        if (user) {
            // Check if the user is active
            if (user.is_deleted) {
                logger.warn(`User is inactive: ${user.id}`);
                throw { status: HttpStatus.FORBIDDEN, message: 'User is inactive' };
            }

            // Verify the password
            const isPasswordValid = await bcrypt.compare(password, user.password || '');
            if (!isPasswordValid) {
                logger.warn(`Invalid password attempt for email: ${email}`);
                throw { status: HttpStatus.UNAUTHORIZED, message: 'Invalid password' };
            }

            // Generate token and refresh token
            const token = generateAccessToken({ id: user.id, type: user.userType });
            const refreshToken = generateRefreshToken({ id: user.id, type: user.userType });

            logger.info(`User logged in successfully: ${user.id}`);
            return { user, message: 'Login successful', token, refreshToken };
        } else {
            logger.error('An unknown error occurred while logging in the user');
            throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred' };
        }
    } catch (error: any) {
        if (error.status) {
            throw error; // Pass custom errors forward
        }

        logger.error(`Error logging in user: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while logging in the user' };
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

function Like(pattern: string): FindOperator<string> {
    return ILike(pattern);
}

