import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    clientSignup,
    clientLogin,
    clientLoginWithEmailOtp,
    clientLoginWithPhoneOtp,
} from '../../../services/v1/auth/userClientAuthService';

export const userClientSignupController = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
    }
    try {
        const { user, token } = await clientSignup(email, password);
        return res.status(HttpStatus.CREATED).json({ message: 'Signup successful', user, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`User signup error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const userClientLoginController = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
    }
    try {
        const { user, token } = await clientLogin(email, password);
        return res.status(HttpStatus.OK).json({ message: 'Login successful', user, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`User login error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const userClientLoginOtpController = async (req: Request, res: Response) => {
    const { email, otpCode, phoneNumber, countryCode } = req.body;
    if (email && otpCode) {
        try {
            const { user, token } = await clientLoginWithEmailOtp(email, otpCode);
            return res.status(HttpStatus.OK).json({ message: 'Login successful', user, token });
        } catch (error: any) {
            const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
            logger.error(`User login OTP (email) error (${status}): ${error.message}`);
            return res.status(status).json({ error: error.message });
        }
    }
    if (phoneNumber != null && countryCode != null && otpCode) {
        try {
            const { user, token } = await clientLoginWithPhoneOtp(phoneNumber, countryCode, otpCode);
            return res.status(HttpStatus.OK).json({ message: 'Login successful', user, token });
        } catch (error: any) {
            const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
            logger.error(`User login OTP (phone) error (${status}): ${error.message}`);
            return res.status(status).json({ error: error.message });
        }
    }
    return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Provide either (email + otpCode) or (phoneNumber + countryCode + otpCode)',
    });
};
