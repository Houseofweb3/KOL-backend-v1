import logger from '../../../config/logger';
import { User } from '../../../entity/auth';
import { AppDataSource } from '../../../config/data-source';
import { Brackets } from 'typeorm';

const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_ORDER = 'DESC';

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

        return {
            users,
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

// service to get user by id with try catch block
export const getUserById = async (id: string) => {
    const userRepository = AppDataSource.getRepository(User);
    try {
        const user = await userRepository.findOneOrFail({ where: { id }, relations: ['carts.checkout'] });
        return user;
    } catch (error) {
        logger.error(`Error while fetching user with id ${id}`);
        throw error;
    }
}


// service to create user with try catch block
export const createUser = async (user: User) => {
    const userRepository = AppDataSource.getRepository(User);
    try {
        const newUser = await userRepository.save(user);
        return newUser;
    } catch (error) {
        logger.error(`Error while creating user`);
        throw error;
    }
};


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