import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { User } from '../entity/User';
import { UserSelectedNiche } from '../entity/UserSelectedNiche';
import { UserReferencePriority } from '../entity/UserReferencePriority';
import { UserSelectedOptions } from '../entity/UserSelectedOptions';
import logger from '../config/logger';

export const createUser = async (id: string, email: string, password?: string, fullname?: string) => {
  const userRepository = AppDataSource.getRepository(User);

  const existingUserById = await userRepository.findOneBy({ id });

  if (existingUserById) {
    if (existingUserById.status === 'inactive') {
      existingUserById.status = 'active';
      await userRepository.save(existingUserById);
      logger.info(`User reactivated successfully: ${id}`);
      return { user: existingUserById, message: 'User login successfully' };
    } else {
      logger.warn(`User already exists and is active: ${id}`);
      throw new Error('User already exists and is active');
    }
  }

  const existingUserByEmail = await userRepository.findOne({ where: { email } });

  if (existingUserByEmail) {
    logger.warn(`User already exists with email: ${email}`);
    throw new Error('User already exists');
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  const user = userRepository.create({
    id,
    email,
    password: hashedPassword,
    fullname,
    status: 'active',
  });

  await userRepository.save(user);
  logger.info(`User created successfully: ${id}`);
  return { user, message: 'User signup successfully' };
};

export const getUserDetailsById = async (id: string): Promise<User | null> => {
  const userRepository = AppDataSource.getRepository(User);
  
  const user = await userRepository.findOne({
    where: { id },
    select: ['email', 'fullname', 'password']
  });

  return user;
};

export const deactivateUserById = async (id: string): Promise<void> => {
  const userRepository = AppDataSource.getRepository(User);
  const userSelectedNicheRepository = AppDataSource.getRepository(UserSelectedNiche);
  const userReferencePriorityRepository = AppDataSource.getRepository(UserReferencePriority);
  const userSelectedOptionsRepository = AppDataSource.getRepository(UserSelectedOptions);

  const user = await userRepository.findOneBy({ id });

  if (!user || user.status !== 'active') {
    throw new Error('User not found or already inactive');
  }

  user.status = 'inactive';
  await userRepository.save(user);

  await userSelectedNicheRepository.delete({ user_id: id });
  await userReferencePriorityRepository.delete({ user_id: id });
  await userSelectedOptionsRepository.delete({ user_id: id });
};