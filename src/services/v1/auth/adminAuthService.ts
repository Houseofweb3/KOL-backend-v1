import bcrypt from 'bcryptjs';
import HttpStatus from 'http-status-codes';
import logger from '../../../config/logger';
import { Admin } from '../../../entity/auth';
import { AppDataSource } from '../../../config/data-source';
import { generateToken3Days } from '../../../middleware/auth';

export const adminSignup = async (email: string, password: string) => {
    const repo = AppDataSource.getRepository(Admin);
    const existing = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
        const err = new Error('Admin with this email already exists');
        (err as any).status = HttpStatus.CONFLICT;
        throw err;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = repo.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        isDeleted: false,
    });
    const saved = await repo.save(admin);
    const token = generateToken3Days({ id: saved.id, type: 'admin' });
    const { password: _p, ...adminWithoutPassword } = saved;
    return { admin: adminWithoutPassword, token };
};

export const adminLogin = async (email: string, password: string) => {
    const repo = AppDataSource.getRepository(Admin);
    const admin = await repo.findOne({ where: { email: email.toLowerCase() } });
    if (!admin || admin.isDeleted) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
        const err = new Error('Invalid email or password');
        (err as any).status = HttpStatus.UNAUTHORIZED;
        throw err;
    }
    const token = generateToken3Days({ id: admin.id, type: 'admin' });
    const { password: _p, ...adminWithoutPassword } = admin;
    return { admin: adminWithoutPassword, token };
};

export const adminLogout = async () => {
    // No refresh token to invalidate; client should discard the JWT
    return { message: 'Logged out successfully' };
};
