import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/data-source';
import { User } from '../entity/auth/User';
import { Option } from '../entity/questionaries/Option';
import { UserSelectedOptions } from '../entity/user/UserSelectedOptions';
import { UserReferencePriority } from '../entity/user/UserReferencePriority';
import logger from '../config/logger';

export const processUserSelectedOptions = async (user_id: string, questions: any[]) => {
  const userRepository = AppDataSource.getRepository(User);
  const optionRepository = AppDataSource.getRepository(Option);
  const userSelectedOptionsRepository = AppDataSource.getRepository(UserSelectedOptions);
  const userReferencePriorityRepository = AppDataSource.getRepository(UserReferencePriority);

  try {
    const startTime = Date.now();

    const userDetails = await userRepository.findOne({
      where: { id: user_id, status: 'active' }
    });

    if (!userDetails) {
      logger.warn(`User not found or not active: user_id=${user_id}`);
      throw new Error('User Not Found or Not Active');
    }

    const selectedOptionIds = questions.map(q => q.selected_option_id);

    const options = await optionRepository.createQueryBuilder('option')
      .where('option.id IN (:...selectedOptionIds)', { selectedOptionIds })
      .andWhere('option.question_id IN (:...questionIds)', { questionIds: questions.map(q => q.question_id) })
      .getMany();

    const optionMap = new Map();
    options.forEach(option => {
      optionMap.set(option.id, option);
    });

    const referenceCounts: { [key: string]: number } = {};

    const createOrUpdateAnswersPromises = questions.map(async question => {
      const { question_id, selected_option_id } = question;

      const selectedOption = optionMap.get(selected_option_id);

      if (!selectedOption || selectedOption.question_id !== question_id) {
        logger.warn(`Invalid option selected: question_id=${question_id}, selected_option_id=${selected_option_id}`);
        throw new Error('Invalid Option');
      }

      if (selectedOption.reference) {
        referenceCounts[selectedOption.reference] = (referenceCounts[selectedOption.reference] || 0) + 1;
      }

      const existingAnswer = await userSelectedOptionsRepository.findOne({
        where: { user_id, question_id }
      });

      if (existingAnswer) {
        existingAnswer.selected_option_id = selected_option_id;
        existingAnswer.updatedAt = new Date();
        return userSelectedOptionsRepository.save(existingAnswer);
      } else {
        const newUserSelectedOption = userSelectedOptionsRepository.create({
          id: uuidv4(),
          user_id,
          question_id,
          selected_option_id,
        });
        return userSelectedOptionsRepository.save(newUserSelectedOption);
      }
    });

    await Promise.all(createOrUpdateAnswersPromises);

    const dataToSave = Object.keys(referenceCounts).map(reference => ({
      id: uuidv4(),
      user_id: user_id,
      reference_name: reference,
      reference_count: referenceCounts[reference],
    }));

    await userReferencePriorityRepository.delete({ user_id });

    await userReferencePriorityRepository.save(dataToSave);

    const endTime = Date.now();
    const responseTimeInMilliseconds = endTime - startTime;
    const responseTimeInSeconds = responseTimeInMilliseconds / 1000;
    logger.info(`Response time: ${responseTimeInSeconds.toFixed(2)} seconds`);

    logger.info(`User selected options processed and priorities saved successfully for user_id: ${user_id}`);
    return 'Answers processed and priorities saved successfully👍';
  } catch (error: any) {
    logger.error('Error processing answers or saving priorities:', error);
    throw error;
  }
};
