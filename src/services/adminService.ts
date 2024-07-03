import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { Admin } from '../entity/Admin';
import logger from '../config/logger';

export const createAdmin = async (id: string, email: string, password?: string, fullname?: string) => {
  const adminRepository = AppDataSource.getRepository(Admin);

  const existingAdmin = await adminRepository.findOne({ where: [{ id }, { email }] });

  if (existingAdmin) {
    logger.warn(`Admin already exists with email: ${email}`);
    throw new Error('Admin already exists');
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  const admin = adminRepository.create({
    id,
    email,
    password: hashedPassword,
    fullname,
    status: 'active',
  });

  await adminRepository.save(admin);
  logger.info(`New admin created: ${id}`);

  return admin;
};
