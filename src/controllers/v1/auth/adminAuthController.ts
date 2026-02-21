import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { adminSignup, adminLogin, adminLogout } from '../../../services/v1/auth/adminAuthService';

export const adminSignupController = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
    }
    try {
        const { admin, token } = await adminSignup(email, password);
        logger.info(`Admin signed up: ${admin.id}`);
        return res.status(HttpStatus.CREATED).json({ message: 'Admin created successfully', admin, token });
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
        const { admin, token } = await adminLogin(email, password);
        return res.status(HttpStatus.OK).json({ message: 'Login successful', admin, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Admin login error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
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
