import { User } from '../../../entity/auth';
import logger from '../../../config/logger';
import { Question, Option, UserOnboardingSelection } from '../../../entity/onboarding';
import { AppDataSource } from '../../../config/data-source';

const userOnboardingSelectionRepository = AppDataSource.getRepository(UserOnboardingSelection);

export const createUserOnboardingSelection = async (
    userId: string,
    questionId: string,
    selectedOptionIds: Array<string>,
) => {
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

        // Find selected option list
        const selectedOptions =
            await AppDataSource.getRepository(Option).findByIds(selectedOptionIds);

        console.log('selectedOptions', selectedOptions);

        // Save each selected option as a new UserOnboardingSelection
        const newUserOnboardingSelection = AppDataSource.getRepository(
            UserOnboardingSelection,
        ).create({
            user,
            question,
            selectedOption: selectedOptions, // Assign the array of selected options
        });

        await AppDataSource.getRepository(UserOnboardingSelection).save(newUserOnboardingSelection);

        logger.info(
            `User onboarding selection created successfully: ${newUserOnboardingSelection.id}`,
        );

        return { message: 'User onboarding selection created successfully' };
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
            relations: ['question', 'selectedOption'],
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
