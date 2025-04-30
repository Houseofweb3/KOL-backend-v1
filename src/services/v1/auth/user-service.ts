import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { User, UserType, UserRole } from '../../../entity/auth/User.entity';
import { Cart } from '../../../entity/cart';
import { OTP } from '../../../entity/auth/Otp.entity';
import { AppDataSource } from '../../../config/data-source';
import { generateAccessToken, generateRefreshToken } from '../../../middleware/auth';
import { sendWelcomeEmail, sendOtpEmail } from '../../../utils/communication/ses/emailSender';
import { create } from 'domain';
import { FindOperator, ILike } from 'typeorm';
import { MessageApiClient } from "@cmdotcom/text-sdk";

const jwtRefreshSecret = ENV.REFRESH_JWT_SECRET;



const yourProductToken: string = "75e8512a-6ba0-41f3-9204-c4b28354dd67"; // TODO: store this in env anf githbs secrets var
// Initialize the messaging API client
const myMessageApi = new MessageApiClient(yourProductToken);

// Function to send an SMS
export async function sendSms(to: string[], senderId: string, message: string): Promise<void> {
    try {
        const result = await myMessageApi.sendTextMessage(to, senderId, message);
        console.log("SMS sent successfully by CM:", result.statusText);
    } catch (error: any) {
        if (error.response) {
            console.error('Error sending SMS:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up the request:', error.message);
        }
    }
}

function generateOTP(): string {
    return randomInt(100000, 999999).toString(); // Securely generate a 6-digit OTP
}


export async function generateAndSendOTP(phoneNumber: string, countryCode: string): Promise<{ message: string, status: number }> {
    try {
        // Find user by email or phone number
        const normalizedPhoneNumber = `+${countryCode}${phoneNumber}`;
        console.log(normalizedPhoneNumber);
        let user = await AppDataSource.getRepository(User).findOne({ where: [{ phoneNumber: normalizedPhoneNumber }] });
        console.log(user);
        // Check if user exists,  and if its an admin
        if (!user || user.userType !== UserType.ADMIN) {
            logger.warn(`User not found with email or phn no.: ${normalizedPhoneNumber}`);
            throw { status: HttpStatus.UNAUTHORIZED, message: 'Admin Not Found' };
        }
        let otpCode: string;
        const expiresAt = Math.floor(Date.now() / 1000) + 60; // OTP expires in 60 seconds
        // Generate a new OTP
        otpCode = generateOTP();
        // Send OTP via CM SMS service
        const sendNo = `00${countryCode}${phoneNumber}`;
        await sendSms([sendNo], "Ampli5", `Your OTP code is ${otpCode}`);

        // Invalidate any existing OTPs for this phone number
        await AppDataSource.transaction(async transactionalEntityManager => {
            await transactionalEntityManager.getRepository(OTP).update(
                { phoneNumber: normalizedPhoneNumber, isUsed: false },
                { isUsed: true }
            );
            // Save the new OTP in the database only after SMS is successfully sent
            const otp = new OTP();
            otp.phoneNumber = normalizedPhoneNumber;
            otp.otpCode = otpCode;
            otp.expiresAt = expiresAt;
            otp.isUsed = false;
            await transactionalEntityManager.getRepository(OTP).save(otp);
        });

        logger.info(`OTP generated and sent successfully to: ${normalizedPhoneNumber}`);

        return { message: 'OTP sent successfully', status: HttpStatus.OK };


    } catch (error: any) {
        if (error.status) {
            throw error; // Pass custom errors forward
        }
        logger.error(`Error generating and sending OTP: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while generating and sending OTP' };
    }
}

// fn to generate otp and send it to the user via email

export async function generateAndSendEmailOTP(email: string): Promise<{ message: string, status: number }> {
    try {
        // Find user by email or phone number
        let user = await AppDataSource.getRepository(User).findOne({ where: [{ email }] });
        // Check if user exists,  and if its an admin
        if (!user || user.userType !== UserType.ADMIN) {
            logger.warn(`User not found with email or phn no.: ${email}`);
            throw { status: HttpStatus.UNAUTHORIZED, message: 'Admin Not Found' };
        }
        let otpCode: string;
        const expiresAt = Math.floor(Date.now() / 1000) + 300; // OTP expires in 300 seconds
        // Generate a new OTP
        otpCode = generateOTP();
        // Send OTP via CM SMS service
        await sendOtpEmail(email, otpCode);

        console.log("send otp email", email, otpCode);

        // Invalidate any existing OTPs for this phone number
        await AppDataSource.transaction(async transactionalEntityManager => {
            await transactionalEntityManager.getRepository(OTP).update(
                { phoneNumber: email, isUsed: false },
                { isUsed: true }
            );
            // Save the new OTP in the database only after SMS is successfully sent
            const otp = new OTP();
            otp.email = email;
            otp.otpCode = otpCode;
            otp.expiresAt = expiresAt;
            otp.isUsed = false;
            await transactionalEntityManager.getRepository(OTP).save(otp);
        });

        logger.info(`OTP generated and sent successfully to: ${email}`);

        return { message: 'OTP sent successfully', status: HttpStatus.OK };


    } catch (error: any) {
        if (error.status) {
            throw error; // Pass custom errors forward
        }
        logger.error(`Error generating and sending OTP: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while generating and sending OTP' };
    }
}

export async function validateOTP(phoneNumber: string, otpCode: string, countryCode: string): Promise<{
    token?: string;
    message: string;
    refreshToken?: string;
    userId?: string;
}> {
    try {
        return await AppDataSource.transaction(async transactionalEntityManager => {
            const normalizedPhoneNumber = `+${countryCode}${phoneNumber}`;
            const otpRepository = transactionalEntityManager.getRepository(OTP);
            const userRepository = transactionalEntityManager.getRepository(User);

            // Step 2: If not whitelisted, proceed with normal OTP validation
            const otpRecord = await otpRepository.findOne({
                where: { phoneNumber: normalizedPhoneNumber, otpCode, isUsed: false }
            });

            if (!otpRecord || otpRecord.expiresAt < Math.floor(Date.now() / 1000)) {
                // thorw error with message and status code
                throw { status: HttpStatus.UNAUTHORIZED, message: 'Invalid OTP or Expired OTP' };
            }

            // Step 3: Mark the OTP as used
            otpRecord.isUsed = true;
            await otpRepository.save(otpRecord);

            // Step 4: Check if the user already exists
            const user = await userRepository.findOne({ where: { phoneNumber: normalizedPhoneNumber } });

            if (user) {
                // if isAdmin also encode phoneNumber in token to authenticate admins based on phoneNumber later on 
                const token = generateAccessToken({ id: user.id, type: user.userType });
                const refreshToken = generateRefreshToken({ id: user.id, type: user.userType });
                return { token, refreshToken, message: 'Login successful', userId: user.id };
            } else {
                // throw error if user is not found with status code 404
                throw { status: HttpStatus.NOT_FOUND, message: 'User not found' };

            }
        });
    } catch (error: any) {
        if (error.status) {
            throw error; // Pass custom errors forward
        }
        logger.error(`Error validating OTP: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while validating OTP' };
    }
}

export async function validateEmailOTP(email: string, otpCode: string): Promise<{
    token?: string;
    message: string;
    refreshToken?: string;
    userId?: string;
}> {
    try {
        return await AppDataSource.transaction(async transactionalEntityManager => {
            const otpRepository = transactionalEntityManager.getRepository(OTP);
            const userRepository = transactionalEntityManager.getRepository(User);

            // Step 2: If not whitelisted, proceed with normal OTP validation
            const otpRecord = await otpRepository.findOne({
                where: { email: email, otpCode, isUsed: false }
            });

            if (!otpRecord || otpRecord.expiresAt < Math.floor(Date.now() / 1000)) {
                // thorw error with message and status code
                throw { status: HttpStatus.UNAUTHORIZED, message: 'Invalid OTP or Expired OTP' };
            }

            // Step 3: Mark the OTP as used
            otpRecord.isUsed = true;
            await otpRepository.save(otpRecord);

            // Step 4: Check if the user already exists
            const user = await userRepository.findOne({ where: { email } });

            if (user) {
                // if isAdmin also encode phoneNumber in token to authenticate admins based on phoneNumber later on 
                const token = generateAccessToken({ id: user.id, type: user.userType });
                const refreshToken = generateRefreshToken({ id: user.id, type: user.userType });
                return { token, refreshToken, message: 'Login successful', userId: user.id };
            } else {
                // throw error if user is not found with status code 404
                throw { status: HttpStatus.NOT_FOUND, message: 'User not found' };

            }
        });
    } catch (error: any) {
        if (error.status) {
            throw error; // Pass custom errors forward
        }
        logger.error(`Error validating OTP: ${error.message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while validating OTP' };
    }
}

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


export const createUser = async (
    email: string,
    password: string,
    fullname?: string,
    type?: string,
    projectName?: string,
    telegramId?: string,
    projectUrl?: string,
    phoneNumber?: string,
    role?: string,
    firstName?: string,
    lastName?: string,
    addressInfo?: Record<string, string>,
) => {
    try {
        // 🔹 Validate email before proceeding
        validateGmail(email);
        return await AppDataSource.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(User, { where: [{ email }] });

            if (user) {
                const token = generateAccessToken({ id: user.id, type });
                const refreshToken = generateRefreshToken({ id: user.id, type });

                if (user.is_deleted) {
                    user.is_deleted = false;
                    await transactionalEntityManager.save(user);

                    logger.info(`User reactivated successfully: ${user.id}`);
                }
                // Verify the password
                const isPasswordValid = await bcrypt.compare(password, user.password || '');
                if (!isPasswordValid) {
                    logger.warn(`Invalid password attempt for email: ${email}`);
                    throw { status: HttpStatus.UNAUTHORIZED, message: 'Invalid password' };
                }

                logger.warn(`User already exists and is active: ${user.id}`);
                return { user, message: 'User already exists. Logging in', token, refreshToken };
            }
            await validateDomainLimit(email);

            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

            // ✅ FIX: Ensure role is `null` instead of an empty string
            const validRole = role && Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : null;

            // Create the entity to store in the DB
            const newUser = transactionalEntityManager.create(User, {
                email,
                password: hashedPassword,
                fullname,
                userType: type as UserType,
                projectName,
                telegramId,
                projectUrl,
                phoneNumber,
                firstName,
                lastName,
                role: validRole, // ✅ Prevents invalid enum errors
                status: true,
                addressInfo
            });

            // Generate token and refresh token
            const token = generateAccessToken({ id: newUser.id, type });
            const refreshToken = generateRefreshToken({ id: newUser.id, type });

            await transactionalEntityManager.save(newUser);

            logger.info(`User created successfully: ${newUser.id}`);
            await sendWelcomeEmail(email);

            return { user: newUser, message: 'User signup successful', token, refreshToken };
        });

    } catch (error) {
        if ((error as any).status) {
            throw error; // Pass custom errors forward
        }

        logger.error(`Error creating user: ${(error as Error).message}`);
        throw { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unknown error occurred while creating the user' };
    }
};



// Login Admins

export const loginAdmin = async (email?: string, phoneNumber?: string) => {
    try {
        // 🔹 Validate email before proceeding

        // Find user by email or phone number
        let user = await AppDataSource.getRepository(User).findOne({ where: [{ email }, { phoneNumber }] });


        // Check if user exists,  and if its an admin
        if (!user || user.userType !== UserType.ADMIN) {
            logger.warn(`User not found with email or phn no.: ${email || phoneNumber}`);
            throw new Error('User not found or not an admin');
        }

        if (user) {

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
            where: { id: userId },
            relations: ['bountySubmissions'] // Fetch bountySubmissions relation
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
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

