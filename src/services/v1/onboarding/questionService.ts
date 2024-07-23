import logger from '../../../config/logger';
import { AppDataSource } from '../../../config/data-source';
import { Question, QuestionType } from '../../../entity/onboarding';

const questionRepository = AppDataSource.getRepository(Question);

export const createQuestion = async (text: string, type: QuestionType, description?: string): Promise<Question> => {
    try {
        const newQuestion = questionRepository.create({ text, type, description });
        await questionRepository.save(newQuestion);
        logger.info(`Question created successfully: ${newQuestion.id}`);
        return newQuestion;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Failed to create question: ${error.message}`);
            throw new Error(`Failed to create question: ${error.message}`);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }
    }
};

// / Fetch all questions or a question by ID
export const getQuestions = async (id?: string): Promise<Question[]> => {
    try {
        if (id) {
            // Fetch a specific question by ID
            const question = await questionRepository.findOne({
                where: { id },
                relations: ['options', 'onboardingQuestions'],
            });

            if (!question) {
                logger.warn(`Question not found with id: ${id}`);
                throw new Error('Question not found');
            }

            return [question];
        } else {
            // Fetch all questions
            const questions = await questionRepository.find({
                relations: ['options', 'onboardingQuestions'],
            });

            return questions;
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Failed to fetch questions: ${error.message}`);
            throw new Error(`Failed to fetch questions: ${error.message}`);
        } else {
            logger.error('An unknown error occurred while fetching questions');
            throw new Error('An unknown error occurred while fetching questions');
        }
    }
};

// Delete Question
export const deleteQuestion = async (id: string) => {
    try {
        const option = await questionRepository.findOneBy({ id });
        if (!option) {
            throw new Error('Question not found');
        }
        await questionRepository.remove(option);
        logger.info(`Question deleted successfully: ${id}`);
        return { message: 'Question deleted successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting Question: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }
    }
};
