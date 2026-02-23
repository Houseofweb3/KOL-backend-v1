import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import {
    adminSignup,
    adminLogin,
    adminLogout,
    sendOtp,
    verifyOtp,
} from '../../../services/v1/admin/auth.service';

export const adminSignupController = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
    }
    try {
        const { user } = await adminSignup(email, password);
        logger.info(`User signed up: ${user.id}`);
        return res.status(HttpStatus.CREATED).json({ message: 'User created successfully', user });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin signup error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};

export const adminLoginController = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
    }
    try {
        const { user, token } = await adminLogin(email, password);
        return res.status(HttpStatus.OK).json({ message: 'Login successful', user, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin login error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};

export const adminLogoutController = async (_req: Request, res: Response) => {
    try {
        const result = await adminLogout();
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        logger.error(`Admin logout error: ${error.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

export const sendOtpController = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email is required' });
    }
    try {
        const result = await sendOtp(email);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Send OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};

export const verifyOtpController = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and code are required' });
    }
    try {
        const { user, token } = await verifyOtp(email, String(code).trim());
        return res.status(HttpStatus.OK).json({ message: 'OTP verified', user, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Verify OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};
