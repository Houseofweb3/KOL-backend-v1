import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { userSendOtpLogin, userVerifyOtpLogin } from '../../../services/v1/web/user-auth.service';

/** POST /web/user/auth/send-otp — body: { email }. User must exist in users table. */
export const userSendOtpLoginController = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email is required' });
    }
    try {
        const result = await userSendOtpLogin(email);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`User send OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};

/** POST /web/user/auth/verify-otp — body: { email, code }. Returns { user, token }. JWT 3 days. */
export const userVerifyOtpLoginController = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and code are required' });
    }
    try {
        const { user, token } = await userVerifyOtpLogin(email, String(code).trim());
        return res.status(HttpStatus.OK).json({ message: 'OTP verified', user, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`User verify OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};
