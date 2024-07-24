import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { OnboardingQuestion, Question } from '../../../entity/onboarding';

const onboardingQuestionRepository = AppDataSource.getRepository(OnboardingQuestion);

export const createOnBoardingQuestion = async (questionId: string, isRequired: boolean, order: number) => {
    try {
        // Find the question by ID
        const question = await AppDataSource.getRepository(Question).findOneBy({ id: questionId });
        if (!question) {
            throw new Error('Question not found');
        }

        // Create a new onboarding question
        const newOnboardingQuestion = onboardingQuestionRepository.create({ question, isRequired, order });
        await onboardingQuestionRepository.save(newOnboardingQuestion);

        logger.info(`Onboarding question created successfully: ${newOnboardingQuestion.id}`);
        return { onBoardingQuestion: newOnboardingQuestion, message: 'onboardingQuestion created successfully' };;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating onboarding question: ${error.message}`);
            throw error;
        } else {
            logger.error('An unknown error occurred during onBoarding question creation');
            throw new Error('An unknown error occurred during onBoarding  question creation');
        }

    }
};

export const getOnBoardingQuestionById = async (id: string) => {
    try {
        const onboardingQuestion = await onboardingQuestionRepository.findOne({
            where: { id },
            relations: ['question']
        });
        if (!onboardingQuestion) {
            throw new Error('Onboarding question not found');
        }
        return onboardingQuestion;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching onboarding question by ID: ${error.message}`);
            throw error;
        } else {
            logger.error('An unknown error occurred during onboarding question creation');
            throw new Error('An unknown error occurred during onboarding question creation');
        }

    }
};

export const getAllOnBoardingQuestions = async () => {
    try {
        const onboardingQuestion = await onboardingQuestionRepository.find({
            relations: ['question']
        });
        if (!onboardingQuestion) {
            throw new Error('Onboarding questions not found');
        }
        return onboardingQuestion;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching onboarding questions by ID: ${error.message}`);
            throw error;
        } else {
            logger.error('An unknown error occurred during onboarding questions creation');
            throw new Error('An unknown error occurred during onboarding questions creation');
        }

    }
};
