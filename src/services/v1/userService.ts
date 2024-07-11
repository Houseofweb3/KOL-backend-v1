import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source'
import { User } from '../../entity/auth/User.entity';
import logger from '../../config/logger';

const userRepository = AppDataSource.getRepository(User);


export const createUser = async (email: string, password?: string, fullname?: string, type?: string) => {
    try {
        // to check if a user with the given id or email already exists
        const existingUser = await AppDataSource.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(User, {
                where: [{ email }],
            });

            if (user) {
                if (user.status) {
                    user.status = true;
                    await transactionalEntityManager.save(user);
                    logger.info(`User reactivated successfully: ${user.id}`);
                    return { user, message: 'User reactivated successfully' };
                } else {
                    logger.warn(`User already exists and is inactive: ${user.id}`);
                    throw new Error('User already exists and is inactive');
                }
            }

            // hash the password only if provided
            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

            // create the entity to store in the db
            const newUser = transactionalEntityManager.create(User, {
                email,
                password: hashedPassword,
                fullname,
                type,
                status: true,
            });

            // save the entity in the db
            await transactionalEntityManager.save(newUser);

            logger.info(`User created successfully: ${newUser.id}`);
            return { user: newUser, message: 'User signup successfully' };
        });

        return existingUser;

    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating user: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred while creating the user');
            throw new Error('An unknown error occurred');
        }
    }
};




// get user details by id
export const getUserDetailsById = async (id: string): Promise<User | null> => {
    try {
        const user = await userRepository.findOneBy({
            id
        });

        if (user) {
            // return  User entity
            return user
        }

        // Return null if the user is not found
        return null;
    } catch (error) {
        logger.error(`Failed to get user details for id: ${id}`, error);
        throw new Error('Failed to get user details');
    }
};


// Deactivate the user provided the id
export const deactivateUserById = async (id: string): Promise<void> => {
    try {
        // Use a transaction to ensure atomicity
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            // Fetch the user and ensure they are active
            const user = await transactionalEntityManager.findOne(User, {
                where: { id },
            });

            if (!user || !user.status) {
                throw new Error('User not found or already inactive');
            }

            // Deactivate the user
            user.status = false;
            await transactionalEntityManager.save(user);

        });
    } catch (error) {
        logger.error(`Failed to deactivate user with id: ${id}`, error);
        throw new Error('Failed to deactivate user');
    }
};