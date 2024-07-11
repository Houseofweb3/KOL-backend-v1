import { Request, Response } from 'express';
import {
  createOption,
  getOptionById,
  getAllOptions,
  updateOption,
  deleteOption
} from '../../services/v1/optionService';
import logger from '../../config/logger';

export const createOptionController = async (req: Request, res: Response) => {
  const { text, questionId } = req.body;

  if (!text || !questionId) {
    logger.warn('Missing required fields in create option request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { option, message } = await createOption(text, questionId);
    return res.status(201).json({ option, message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error during option creation: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred during option creation');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export const getOptionController = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const option = await getOptionById(id);
    return res.status(200).json(option);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error fetching option by ID: ${error.message}`);
      return res.status(404).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while fetching option');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export const getAllOptionsController = async (req: Request, res: Response) => {
  try {
    const options = await getAllOptions();
    return res.status(200).json(options);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error fetching all options: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while fetching all options');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export const updateOptionController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text) {
    logger.warn('Missing required fields in update option request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { option, message } = await updateOption(id, text);
    return res.status(200).json({ option, message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error updating option: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred during option update');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export const deleteOptionController = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await deleteOption(id);
    return res.status(200).json({ message: 'Option deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error deleting option: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred during option deletion');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};
