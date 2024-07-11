import { AppDataSource } from '../../config/data-source';
import { UserOnboardingSelection } from '../../entity/onboarding';
import { User } from '../../entity/auth';
import { Question, Option } from '../../entity/onboarding';
import logger from '../../config/logger';

const userOnboardingSelectionRepository = AppDataSource.getRepository(UserOnboardingSelection);

export const createUserOnboardingSelection = async (userId: string, questionId: string, selectedOptionId: string) => {
    try {
        // Find user by ID
        const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        // Find question by ID
        const question = await AppDataSource.getRepository(Question).findOneBy({ id: questionId });
        if (!question) {
            throw new Error('Question not found');
        }

        // Find selected option by ID
        const selectedOption = await AppDataSource.getRepository(Option).findOneBy({ id: selectedOptionId });
        if (!selectedOption) {
            throw new Error('Selected option not found');
        }

        // Create a new user onboarding selection
        const newUserOnboardingSelection = userOnboardingSelectionRepository.create({
            user,
            question,
            selectedOption
        });
        await userOnboardingSelectionRepository.save(newUserOnboardingSelection);

        logger.info(`User onboarding selection created successfully: ${newUserOnboardingSelection.id}`);
        return { userOnboardingSelection: newUserOnboardingSelection, message: 'User onboarding selection created successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating user onboarding selection: ${error.message}`);
            throw new Error('Internal Server Error');
        } else {
            logger.error('An unknown error occurred during onBoarding question creation');
            throw new Error('An unknown error occurred during onBoarding  question creation');
        }

    }
};

export const getUserOnboardingSelectionsByUserId = async (userId: string) => {
    try {
        const userOnboardingSelections = await userOnboardingSelectionRepository.find({
            where: { user: { id: userId } },
            relations: ['question', 'selectedOption']
        });
        return userOnboardingSelections;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching user onboarding selections by user ID: ${error.message}`);
            throw new Error('Internal Server Error');
        } else {
            logger.error('An unknown error occurred during onBoarding question creation');
            throw new Error('An unknown error occurred during onBoarding  question creation');
        }

    }
};
