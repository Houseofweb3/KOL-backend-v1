import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { clientSendOtp, clientVerifyOtp, clientSignup } from '../../../services/v1/web/client-auth.service';

/** POST /web/client/send-otp - body: { email }. Client must exist in clients table. */
export const clientSendOtpController = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email is required' });
    }
    try {
        const result = await clientSendOtp(email);
        return res.status(HttpStatus.OK).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Client send OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};

/** POST /web/client/verify-otp - body: { email, code }. Returns { client, token }. JWT 3 days, contains client id and email. */
export const clientVerifyOtpController = async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and code are required' });
    }
    try {
        const { client, token } = await clientVerifyOtp(email, String(code).trim());
        return res.status(HttpStatus.OK).json({ message: 'OTP verified', client, token });
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Client verify OTP error (${status}): ${error.message}`);
        const body: { error: string; code?: string } = { error: error.message };
        if (error.code) body.code = error.code;
        return res.status(status).json(body);
    }
};


/** POST /web/client/auth/signup – brand intake form. Creates client in DB and sends new client onboard notification. */
export const clientSignupController = async (req: Request, res: Response) => {
    const body = req.body || {};
    try {
        const result = await clientSignup(body);
        return res.status(HttpStatus.CREATED).json(result);
    } catch (error: any) {
        const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Client signup error (${status}): ${error.message}`);
        return res.status(status).json({ error: error.message });
    }
};