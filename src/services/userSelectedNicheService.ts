import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { UserSelectedNiche } from '../entity/UserSelectedNiche';

export const updateUserSelectedNiche = async (user_id: string, niche_name: string[]) => {
  const userRepository = AppDataSource.getRepository(User);
  const userSelectedNicheRepository = AppDataSource.getRepository(UserSelectedNiche);

  try {
    const user = await userRepository.findOne({ where: { id: user_id }, select: ['status'] });

    if (!user || user.status !== 'active') {
      throw new Error('User not found or not active');
    }

    const existingEntry = await userSelectedNicheRepository.findOne({ where: { user_id } });

    if (existingEntry) {
      existingEntry.niche_name = niche_name;
      existingEntry.updatedAt = new Date();

      const updatedUserSelectedNiche = await userSelectedNicheRepository.save(existingEntry);
      return { message: 'User selected niches updated successfully👍', data: updatedUserSelectedNiche };
    } else {
      const newUserSelectedNiche = userSelectedNicheRepository.create({
        id: uuidv4(),
        niche_name,
        user_id,
      });

      const createdUserSelectedNiche = await userSelectedNicheRepository.save(newUserSelectedNiche);
      return { message: 'User selected niches created successfully👍', data: createdUserSelectedNiche };
    }
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message);
  }
};
