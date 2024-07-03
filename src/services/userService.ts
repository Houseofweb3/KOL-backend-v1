import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import logger from '../config/logger';

export const createUser = async (id: string, email: string, password?: string, fullname?: string) => {
  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOne({ where: [{ id }, { email }] });

  if (existingUser) {
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

  return user;
};
