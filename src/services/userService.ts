import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';

export const createUser = async (id: string, email: string, password?: string, fullname?: string) => {
  const userRepository = AppDataSource.getRepository(User);

  // Check if the user already exists by ID or email
  const existingUser = await userRepository.findOne({ where: [{ id }, { email }] });

  if (existingUser) {
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

  return user;
};
