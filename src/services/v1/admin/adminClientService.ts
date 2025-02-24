import logger from '../../../config/logger';
import { User } from '../../../entity/auth';
import { AppDataSource } from '../../../config/data-source';


// serivce to get all users, add sorting and pagination for admin
export const getAllUsers = async (page: number, limit: number, sort: string, order: string) => {
    try {
        const offset = (page - 1) * limit;
        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find({
            order: {
                [sort]: order
            },
            take: limit,
            skip: offset,
            relations: ['carts.checkout'],
            
        });
        return users;
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
    const userRepository = AppDataSource.getRepository(User);
    try {
        const data = await userRepository.update(id, user);
        return data;
    } catch (error) {
        logger.error(`Error while updating user with id ${id}`);
        throw error;
    }
};