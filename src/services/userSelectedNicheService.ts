// import { v4 as uuidv4 } from 'uuid';
// import { AppDataSource } from '../config/data-source';
// import { User } from '../entity/auth/User.entity';
// import { UserSelectedNiche } from '../entity/user/UserSelectedNiche.entity.';
// import logger from '../config/logger';

// export const updateUserSelectedNiche = async (user_id: string, niche_name: string[]) => {
//   const userRepository = AppDataSource.getRepository(User);
//   const userSelectedNicheRepository = AppDataSource.getRepository(UserSelectedNiche);

//   try {
//     const user = await userRepository.findOne({ where: { id: user_id }, select: ['status'] });

//     if (!user || user.status !== 'active') {
//       logger.warn(`User not found or not active: user_id=${user_id}`);
//       throw new Error('User not found or not active');
//     }

//     const existingEntry = await userSelectedNicheRepository.findOne({ where: { user_id } });

//     if (existingEntry) {
//       existingEntry.niche_name = niche_name;
//       existingEntry.updatedAt = new Date();

//       await userSelectedNicheRepository.save(existingEntry);
//       logger.info(`User selected niches updated successfully for user_id: ${user_id}`);
//       return { message: 'User selected niches updated successfully👍' };
//     } else {
//       const newUserSelectedNiche = userSelectedNicheRepository.create({
//         id: uuidv4(),
//         niche_name,
//         user_id,
//       });

//       await userSelectedNicheRepository.save(newUserSelectedNiche);
//       logger.info(`User selected niches created successfully for user_id: ${user_id}`);
//       return { message: 'User selected niches created successfully👍' };
//     }
//   } catch (error: any) {
//     logger.error(`Error updating user selected niches for user_id: ${user_id}`, error);
//     throw new Error(error.message);
//   }
// };
