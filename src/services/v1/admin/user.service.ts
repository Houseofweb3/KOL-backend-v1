import HttpStatus from 'http-status-codes';
import { User } from '../../../entity/user.entity';
import { AppDataSource } from '../../../config/data-source';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface GetAllUsersOptions {
    page?: number;
    limit?: number;
    search?: string;
    includeDeleted?: boolean;
}

export interface GetAllUsersResult {
    users: Omit<User, 'password'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Admin: get users with pagination and optional search by email. */
export const getAllUsers = async (options: GetAllUsersOptions = {}): Promise<GetAllUsersResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const includeDeleted = options.includeDeleted ?? false;

    const repo = AppDataSource.getRepository(User);
    const qb = repo
        .createQueryBuilder('u')
        .select([
            'u.id',
            'u.email',
            'u.role',
            'u.isVerified',
            'u.isDeleted',
            'u.createdAt',
            'u.updatedAt',
            'u.deletedAt',
        ])
        .orderBy('u.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    if (!includeDeleted) {
        qb.andWhere('u.isDeleted = :isDeleted', { isDeleted: false });
    }
    if (search) {
        qb.andWhere('u.email ILike :email', { email: `%${search}%` });
    }

    const [users, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { users, total, page, limit, totalPages };
};

/** Admin: update user is_verified status. */
export const updateVerificationStatus = async (userId: string, isVerified: boolean) => {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
        const err = new Error('User not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    user.isVerified = isVerified;
    await repo.save(user);
    const { password: _p, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
};

/** Admin: soft-delete user (set isDeleted = true). */
export const deleteUser = async (userId: string) => {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
        const err = new Error('User not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    user.isDeleted = true;
    if (user.deletedAt == null) {
        user.deletedAt = new Date();
    }
    await repo.save(user);
    const { password: _p, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
};
