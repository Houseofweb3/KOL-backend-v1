import bcrypt from 'bcryptjs';
import logger from '../../../config/logger';
import { User, UserType, UserRole } from '../../../entity/auth';
import { AppDataSource } from '../../../config/data-source';
import { Brackets } from 'typeorm';
import HttpStatus from 'http-status-codes';
import { validateGmail, validateDomainLimit } from '../auth/user-service';

const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_ORDER = 'DESC';

/**
 * Create client (user) with same payload as signup. Password is hashed, defaults applied.
 * Required: email, password, fullname, type. Rest optional / auto.
 */
export const createClient = async (
    email: string,
    password: string,
    fullname?: string,
    type?: string,
    projectName?: string,
    telegramId?: string,
    projectUrl?: string,
    phoneNumber?: string,
    role?: string,
    firstName?: string,
    lastName?: string,
    addressInfo?: Record<string, string>,
    profilePicture?: string
) => {
    try {
        validateGmail(email);
        await validateDomainLimit(email);

        const userRepository = AppDataSource.getRepository(User);
        const existing = await userRepository.findOne({ where: { email } });
        if (existing) {
            const err = new Error('User with this email already exists');
            (err as any).status = HttpStatus.CONFLICT;
            throw err;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const validRole = UserRole.USER;

        const newUser = userRepository.create({
            email,
            password: hashedPassword,
            fullname,
            userType: (type as UserType) || UserType.USER,
            projectName,
            telegramId,
            projectUrl,
            phoneNumber,
            firstName,
            lastName,
            role: validRole,
            addressInfo,
            profilePicture,
            is_deleted: false,
        });

        const saved = await userRepository.save(newUser);
        const { password: _p, ...userWithoutPassword } = saved;
        return userWithoutPassword;
    } catch (error: any) {
        if (error.status) throw error;
        logger.error(`Error while creating client: ${error.message}`);
        throw error;
    }
};

// serivce to get all users, add sorting and pagination for admin
export const getAllUsers = async (
    page: number,
    limit: number,
    searchTerm: string = '',
    sortField: string = DEFAULT_SORT_FIELD,
    sortOrder: 'ASC' | 'DESC' = DEFAULT_SORT_ORDER
) => {
    try {
        const query = AppDataSource.getRepository(User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.carts', 'cart') // Fetch user carts
            .leftJoinAndSelect('cart.checkout', 'checkout') // Fetch checkout details within carts
            .where(
                new Brackets((qb) => {
                    qb.where('user.is_deleted = :is_deleted', { is_deleted: false })
                      .orWhere('user.is_deleted IS NULL');
                })
            )
            .andWhere(searchTerm ? 'user.fullname ILIKE :searchTerm OR user.first_name ILIKE :searchTerm OR user.last_name ILIKE :searchTerm' : '1=1', {
                searchTerm: `%${searchTerm}%`,
            })
            .orderBy(`user.${sortField}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [users, total] = await query.getManyAndCount();

        const usersWithoutPassword = users.map(({ password, ...user }) => user);

        return {
            users: usersWithoutPassword,
            pagination: {
                page: page || 1, // Default to page 1
                limit: limit || 10, // Default limit
                total,
                totalPages: limit ? Math.ceil(total / limit) : 1, // Avoid division by zero
            },
        };
    }
    catch (error) {
        logger.error(`Error while fetching all list users}`);
        throw error;
    }
};

// get all clients for export/download (no pagination, no password)
export const getAllClientsForExport = async () => {
    try {
        const userSelect = [
            'user.id', 'user.email', 'user.fullname', 'user.profilePicture',
            'user.firstName', 'user.lastName', 'user.projectName', 'user.telegramId',
            'user.projectUrl', 'user.phoneNumber', 'user.is_deleted', 'user.userType',
            'user.role', 'user.addressInfo', 'user.createdAt', 'user.updatedAt', 'user.deletedAt'
        ];
        const users = await AppDataSource.getRepository(User)
            .createQueryBuilder('user')
            .select(userSelect)
            .orderBy('user.email', 'ASC')
            .getMany();
        return users;
    } catch (error) {
        logger.error('Error while fetching all clients for export:', error);
        throw error;
    }
};

// service to get user by id with try catch block
export const getUserById = async (id: string) => {
    const userRepository = AppDataSource.getRepository(User);
    try {
        const user = await userRepository.findOneOrFail({ where: { id }, relations: ['carts.checkout'] });
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } catch (error) {
        logger.error(`Error while fetching user with id ${id}`);
        throw error;
    }
}

// service to update user with try catch block
export const updateUser = async (id: string, user: User) => {
    console.log(user, "user");

    const userRepository = AppDataSource.getRepository(User);
    try {
        const data = await userRepository.update(id, user);
        return data;
    } catch (error) {
        logger.error(`Error while updating user with id ${id}`);
        throw error;
    }
};