import bcrypt from 'bcryptjs';
import HttpStatus from 'http-status-codes';
import { User } from '../../../entity/user.entity';
import { UserRole, USER_ROLE_DEFAULT } from '../../../constants/roles';
import { Otp } from '../../../entity/otp.entity';
import { AppDataSource } from '../../../config/data-source';
import { ENV } from '../../../config/env';
import { generateToken3Days } from '../../../middleware/auth';
import { sendOtpEmail } from '../../../utils/email';

const OTP_EXPIRY_MS = ENV.OTP_EXPIRY_MINUTES * 60 * 1000;
const OTP_LENGTH = Math.min(9, Math.max(4, ENV.OTP_LENGTH));

function generateOtpCode(): string {
    const max = Math.pow(10, OTP_LENGTH) - 1;
    const n = Math.floor(Math.random() * (max + 1));
    return n.toString().padStart(OTP_LENGTH, '0');
}

export const adminSignup = async (email: string, password: string) => {
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
        role: USER_ROLE_DEFAULT,
    });
    const saved = await repo.save(user);
    const { password: _p, ...userWithoutPassword } = saved;
    return { user: userWithoutPassword };
};

export const adminLogin = async (email: string, password: string) => {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (user.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (!user.isVerified) {
        const err = new Error('Account not verified. Wait for admin approval');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_NOT_VERIFIED';
        throw err;
    }
    const token = generateToken3Days({ id: user.id, type: UserRole.ADMIN });
    const { password: _p, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};

export const adminLogout = async () => {
    return { message: 'Logged out successfully' };
};

export const sendOtp = async (email: string) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        const err = new Error('No user found with this email');
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

    await sendOtpEmail(email.toLowerCase(), code, ENV.OTP_EXPIRY_MINUTES);

    return { message: 'OTP sent successfully', expiresInMinutes: ENV.OTP_EXPIRY_MINUTES };
};

export const verifyOtp = async (email: string, code: string) => {
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
        const err = new Error('User not found');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    if (user.isDeleted) {
        const err = new Error('Account has been deactivated. Contact support.');
        (err as any).status = HttpStatus.FORBIDDEN;
        (err as any).code = 'ACCOUNT_DEACTIVATED';
        throw err;
    }

    const token = generateToken3Days({ id: user.id, type: UserRole.ADMIN });
    const { password: _p, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};
