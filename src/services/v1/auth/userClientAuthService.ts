import bcrypt from 'bcryptjs';
import HttpStatus from 'http-status-codes';
import logger from '../../../config/logger';
import { User } from '../../../entity/auth';
import { Role } from '../../../entity/auth/Role.enum';
import { AppDataSource } from '../../../config/data-source';
import { generateToken3Days } from '../../../middleware/auth';
import { validateEmailOTP, validateOTP } from './user-service';

/**
 * User (client) signup – email + password. Returns JWT valid 3 days, no refresh token.
 */
export const clientSignup = async (email: string, password: string) => {
    const repo = AppDataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
        const err = new Error('User with this email already exists');
        (err as any).status = HttpStatus.CONFLICT;
        throw err;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = repo.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        clientRole: Role.USER,
        is_deleted: false,
    });
    const saved = await repo.save(user);
    const token = generateToken3Days({ id: saved.id, type: 'user' });
    const { password: _p, ...userWithoutPassword } = saved;
    return { user: userWithoutPassword, token };
};

/**
 * User (client) login – email + password. Returns JWT valid 3 days, no refresh token.
 */
export const clientLogin = async (email: string, password: string) => {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (!user || user.is_deleted) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    const token = generateToken3Days({ id: user.id, type: 'user' });
    const { password: _p, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};

/**
 * User (client) login with OTP – by email. Returns JWT valid 3 days, no refresh token.
 */
export const clientLoginWithEmailOtp = async (email: string, otpCode: string) => {
    try {
        const result = await validateEmailOTP(email, otpCode);
        if (!result.userId) {
            const err = new Error(result.message || 'Invalid or expired OTP');
            (err as any).status = HttpStatus.UNAUTHORIZED;
            throw err;
        }
        const repo = AppDataSource.getRepository(User);
        const user = await repo.findOneOrFail({ where: { id: result.userId } });
        const token = generateToken3Days({ id: user.id, type: 'user' });
        const { password: _p, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    } catch (e: any) {
        if (e.status) throw e;
        throw e;
    }
};

/**
 * User (client) login with OTP – by phone. Returns JWT valid 3 days, no refresh token.
 */
export const clientLoginWithPhoneOtp = async (phoneNumber: string, countryCode: string, otpCode: string) => {
    try {
        const result = await validateOTP(phoneNumber, otpCode, countryCode);
        if (!result.userId) {
            const err = new Error(result.message || 'Invalid or expired OTP');
            (err as any).status = HttpStatus.UNAUTHORIZED;
            throw err;
        }
        const repo = AppDataSource.getRepository(User);
        const user = await repo.findOneOrFail({ where: { id: result.userId } });
        const token = generateToken3Days({ id: user.id, type: 'user' });
        const { password: _p, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    } catch (e: any) {
        if (e.status) throw e;
        throw e;
    }
};
