import HttpStatus from 'http-status-codes';
import { User } from '../../../entity/user.entity';
import { Otp } from '../../../entity/otp.entity';
import { AppDataSource } from '../../../config/data-source';
import { ENV } from '../../../config/env';
import logger from '../../../config/logger';
import { generateUserToken3Days } from '../../../middleware/auth';
import { sendClientOtpEmail } from '../../../utils/email';

const OTP_EXPIRY_MS = ENV.OTP_EXPIRY_MINUTES * 60 * 1000;
const OTP_LENGTH = Math.min(9, Math.max(4, ENV.OTP_LENGTH));

function generateOtpCode(): string {
    const max = Math.pow(10, OTP_LENGTH) - 1;
    const n = Math.floor(Math.random() * (max + 1));
    return n.toString().padStart(OTP_LENGTH, '0');
}

function publicUserFields(user: User) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
    };
}

/**
 * Send OTP to email for a row in `users`. Uses the same email template as client portal login.
 */
export const userSendOtpLogin = async (email: string) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        const err = new Error('No user found with this email.');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (user.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const otpRepo = AppDataSource.getRepository(Otp);
    const otp = otpRepo.create({
        email: email.toLowerCase(),
        code,
        expiresAt,
        isUsed: false,
    });
    await otpRepo.save(otp);

    await sendClientOtpEmail(email.toLowerCase(), code, ENV.OTP_EXPIRY_MINUTES);
    logger.info(`User web OTP sent (userId=${user.id})`);

    return { message: 'OTP sent successfully', expiresInMinutes: ENV.OTP_EXPIRY_MINUTES };
};

/**
 * Verify OTP and return user (safe fields) + JWT (3 days). Payload: user id, type user, email — same pattern as client verify.
 */
export const userVerifyOtpLogin = async (email: string, code: string) => {
    const otpRepo = AppDataSource.getRepository(Otp);
    const otp = await otpRepo.findOne({
        where: { email: email.toLowerCase(), code, isUsed: false },
        order: { createdAt: 'DESC' },
    });
    if (!otp) {
        const err = new Error('Invalid or expired OTP');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (new Date() > otp.expiresAt) {
        const err = new Error('OTP has expired');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }

    otp.isUsed = true;
    await otpRepo.save(otp);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        const err = new Error('User not found.');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (user.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }

    const token = generateUserToken3Days(user.id, user.email);
    return {
        user: publicUserFields(user),
        token,
    };
};
