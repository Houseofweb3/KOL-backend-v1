import { AppDataSource } from '../../config/data-source';
import { Option, Question } from '../../entity/onboarding';
import logger from '../../config/logger';

const optionRepository = AppDataSource.getRepository(Option);

export const createOption = async (text: string, questionId: string) => {
    try {
        // Find the question by ID
        const question = await AppDataSource.getRepository(Question).findOneBy({ id: questionId });
        if (!question) {
            throw new Error('Question not found');
        }

        // Create a new option
        const newOption = optionRepository.create({ text, question });
        await optionRepository.save(newOption);

        logger.info(`Option created successfully: ${newOption.id}`);
        return { option: newOption, message: 'Option created successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error creating option: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};

export const getOptionById = async (id: string) => {
    try {
        // Fetch option with the associated question
        const option = await optionRepository.findOne({
            where: { id },
            relations: ['question']
        });
        if (!option) {
            throw new Error('Option not found');
        }
        return option;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching option by ID: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};

export const getAllOptions = async () => {
    try {
        const options = await optionRepository.find({
            relations: ['question']
        });
        return options;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching all options: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};

export const updateOption = async (id: string, text: string) => {
    try {
        const option = await optionRepository.findOneBy({ id });
        if (!option) {
            throw new Error('Option not found');
        }
        option.text = text;
        await optionRepository.save(option);
        logger.info(`Option updated successfully: ${option.id}`);
        return { option, message: 'Option updated successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error updating option: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};

export const deleteOption = async (id: string) => {
    try {
        const option = await optionRepository.findOneBy({ id });
        if (!option) {
            throw new Error('Option not found');
        }
        await optionRepository.remove(option);
        logger.info(`Option deleted successfully: ${id}`);
        return { message: 'Option deleted successfully' };
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting option: ${error.message}`);
            throw new Error(error.message);
        } else {
            logger.error('An unknown error occurred during question creation');
            throw new Error('An unknown error occurred during question creation');
        }

    }
};
