import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { User } from '../../../entity/auth/User.entity';
import { AppDataSource } from '../../../config/data-source';
import { generateAccessToken, generateRefreshToken } from '../../../middleware/auth';

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
export const loginUser = async (email: string, password: string) => {
    try {
        // Find user by email
        const user = await AppDataSource.getRepository(User).findOne({
            where: [{ email }],
        });
        // Check if user exists
        if (!user) {
            logger.warn(`User not found with email: ${email}`);
            throw new Error('User not found');
        }

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
