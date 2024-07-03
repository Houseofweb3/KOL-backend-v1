import { Request, Response } from 'express';
import { createUser } from '../services/userService';
import logger from '../config/logger';

export const signup = async (req: Request, res: Response) => {
  try {
    const { id, email, password, fullname } = req.body;

    if (!id || !email || !password || !fullname) {
      logger.warn('Missing required fields in signup request');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await createUser(id, email, password, fullname);
    logger.info(`User created successfully: ${id}`);
    return res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        logger.warn(`Signup attempt with existing user: ${req.body.email}`); // Using req.body.email
        return res.status(409).json({ error: error.message });
      } else {
        logger.error(`Error during signup: ${error.message}`);
        return res.status(400).json({ error: error.message });
      }
    } else {
      logger.error('Unexpected error during signup');
      return res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};
