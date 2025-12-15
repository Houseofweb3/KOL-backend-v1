import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    loginUser,
    createUser,
    deactivateUserById,
    refreshTokenService,
    getUserDetailsAndOrderHistoryById,
    generateAndSendOTP,
    validateOTP,
    generateAndSendEmailOTP,
    validateEmailOTP,
    verificationUser,
} from '../../../services/v1/auth/user-service';
import { ENV } from '../../../config/env';
import { RefreshToken } from '../../../entity/auth';
import { AppDataSource } from '../../../config/data-source';

// create a signp User
export const signup = async (req: Request, res: Response) => {
    const {
        email,
        password,
        fullname,
        type,
        projectName,
        telegramId,
        projectUrl,
        phoneNumber,
        role,
        firstName,
        lastName,
        addressInfo,
        profilePicture,
    } = req.body;

    if (!email || !password || !fullname || !type) {
        logger.warn('Missing required fields in signup request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const { user, message, token, refreshToken } = await createUser(
            email,
            password,
            fullname,
            type,
            projectName,
            telegramId,
            projectUrl,
            phoneNumber,
            role,
            firstName,
            lastName,
            addressInfo,
            profilePicture,
        );

        logger.info(`User created/updated successfully: ${user?.id}`);
        return res
            .status(HttpStatus.CREATED)
            .json({ user, message, accessToken: token, refreshToken });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during signup';

        logger.error(`Signup error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// TODO: revert the changes made i nlogin API.
// Login User
export const userVerify = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        logger.warn('Missing required fields in verify');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const result = await verificationUser(email, password);

        return res.status(HttpStatus.OK).json({
            success: true,
            message: 'User verified successfully',
            data: result.user,
            token: result.token,
        });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during login';

        logger.error(`Login error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password, fullname, type } = req.body;

    // Validate input fields
    if (!email || !password) {
        logger.warn('Missing required fields in login request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        // Call the service function to handle the login logic
        const { user, message, token, refreshToken } = await loginUser(
            email,
            password,
            fullname,
            type,
        );

        // Log successful login
        // logger.info(`User logged in successfully: ${user.id}`);
        // Respond with user details and token
        return res.status(HttpStatus.OK).json({ user, message, accessToken: token, refreshToken });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during login';

        logger.error(`Login error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Refresh Token
export const refreshTokenhandler = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // Validate input fields
    if (!refreshToken) {
        logger.warn('Refresh token is missing');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
    }

    try {
        const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
        // Check if the refresh token is on the blacklist
        const tokenEntry = await refreshTokenRepository.findOne({ where: { token: refreshToken } });

        if (tokenEntry) {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Refresh token is invalid',
            });
        }
        // Call the service function to handle the login logic
        const { newAccessToken } = await refreshTokenService(refreshToken);

        logger.info('Refresh token processed successfully');

        // Respond with the new access token
        return res.status(HttpStatus.OK).json({ newAccessToken });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Refresh token is required') {
                logger.warn('Refresh token missing in request');
                return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
            } else if (error.message === 'Invalid refresh token') {
                logger.warn('Invalid refresh token provided');
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: error.message });
            } else {
                logger.error(`Error during token refresh: ${error.message}`);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
            }
        } else {
            logger.error('An unknown error occurred during token refresh');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

// Logout
export const logoutController = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Refresh token is required',
        });
    }

    try {
        // Refresh Token expiration period
        const tokenExpirationDays = ENV.REFRESH_TOKEN_EXPIRATION_DAYS;
        const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

        // Add the refresh token to the blacklist
        const tokenEntry = refreshTokenRepository.create({
            token: refreshToken,
            expiresAt: new Date(Date.now() + tokenExpirationDays * 24 * 60 * 60 * 1000),
        });

        await refreshTokenRepository.save(tokenEntry);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

//get User profile information
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        // Extract userId from query and validate
        const { userId } = req.params;

        if (typeof userId !== 'string') {
            logger.warn('Invalid or missing userId query parameter');
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid or missing userId' });
        }

        // Fetch user details by ID
        const { user, checkoutHistory } = await getUserDetailsAndOrderHistoryById(userId);

        if (!user) {
            logger.warn(`User not found: ${userId}`);
            return res.status(HttpStatus.NOT_FOUND).json({ error: 'User not found' });
        }

        // Destructure only the required fields from the user object
        const { email, fullname } = user;
        return res.status(HttpStatus.OK).json({ user, checkoutHistory });
    } catch (error) {
        if (error instanceof Error) {
            // Handle unexpected errors
            logger.error(`Error fetching user details: ${error.message}`);
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unexpected error occurred' });
        } else {
            // Handle cases where error is not an instance of Error
            logger.error('An unknown error occurred while fetching user details');
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: 'An unknown error occurred' });
        }
    }
};

// Deactive the profile
export const deactivateUser = async (req: Request, res: Response) => {
    try {
        // Extract userId from the request body and validate
        const { userId } = req.params;

        if (typeof userId !== 'string') {
            logger.warn('Invalid or missing userId in request body');
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid or missing userId' });
        }

        // Deactivate the user and handle related records
        await deactivateUserById(userId);

        logger.info(`User deactivated and related records deleted: ${userId}`);

        return res.status(HttpStatus.OK).json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        // Log and handle known errors
        logger.error(`Error during user deactivation: ${error.message}`);

        if (error.message === 'User not found or already inactive') {
            return res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
        }
        return res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: 'An unexpected error occurred' });
    }
};

// Generate OTP
export const generateOTP = async (req: Request, res: Response) => {
    try {
        // Extract userId from the request body and validate
        const { phoneNumber, countryCode } = req.body;

        // add checks for phone number and country code
        if (!phoneNumber || !countryCode) {
            logger.warn('Invalid or missing phone number or country code in request body');
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ error: 'Invalid or missing phone number or country code' });
        }

        // Generate OTP and send to user
        const { message, status } = await generateAndSendOTP(phoneNumber, countryCode);

        logger.info(`OTP generated and sent to user: ${phoneNumber}`);

        return res.status(HttpStatus.OK).json({ message, status });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during login';

        logger.error(`Login error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Generate Email OTP
export const generateEmailOTP = async (req: Request, res: Response) => {
    try {
        // Extract userId from the request body and validate
        const { email } = req.body;

        // add checks for phone number and country code
        if (!email) {
            logger.warn('Invalid or missing email in request body');
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid or missing email' });
        }

        // Generate OTP and send to user
        const { message, status } = await generateAndSendEmailOTP(email);

        logger.info(`OTP generated and sent to user: ${email}`);

        return res.status(HttpStatus.OK).json({ message, status });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during login';

        logger.error(`Login error (${statusCode}): ${errorMessage}`);
        console.log(error);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Validate OTP
export const validateOTPController = async (req: Request, res: Response) => {
    try {
        // Extract userId from the request body and validate
        const { phoneNumber, otpCode, countryCode } = req.body;

        // add checks for phone number and email
        if (!phoneNumber || !otpCode) {
            logger.warn('Invalid or missing phone number or OTP in request body');
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ error: 'Invalid or missing phone number or OTP' });
        }

        // Validate OTP and send to user
        const { message, token, refreshToken, userId } = await validateOTP(
            phoneNumber,
            otpCode,
            countryCode,
        );

        logger.info(`OTP validated successfully for user: ${phoneNumber}`);

        return res
            .status(HttpStatus.OK)
            .json({ message, accessToken: token, refreshToken, userId });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during OTP validation';

        logger.error(`OTP validation error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};

// Validate Email OTP

export const validateEmailOTPController = async (req: Request, res: Response) => {
    try {
        // Extract userId from the request body and validate
        const { email, otpCode } = req.body;

        // add checks for phone number and email
        if (!email || !otpCode) {
            logger.warn('Invalid or missing email or OTP in request body');
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ error: 'Invalid or missing email or OTP' });
        }

        // Validate OTP and send to user
        const { message, token, refreshToken, userId } = await validateEmailOTP(email, otpCode);

        logger.info(`OTP validated successfully for user: ${email}`);

        return res
            .status(HttpStatus.OK)
            .json({ message, accessToken: token, refreshToken, userId });
    } catch (error: any) {
        const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const errorMessage = error.message || 'An unknown error occurred during OTP validation';

        logger.error(`OTP validation error (${statusCode}): ${errorMessage}`);

        return res.status(statusCode).json({ error: errorMessage });
    }
};
