import { Request, Response } from 'express';
import { createAdmin } from '../services/adminService';
import logger from '../config/logger';

export const signup = async (req: Request, res: Response) => {
  console.log('Request Body:', req.body); // Add this line to debug
  const { id, email, password, fullname } = req.body;

  if (!id || !email || !password || !fullname) {
    logger.warn('Signup attempt with missing fields');
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const admin = await createAdmin(id, email, password, fullname);
    logger.info(`Admin created: ${id}`);
    res.status(201).json(admin);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Admin already exists') {
        logger.warn(`Signup attempt with existing admin: ${email}`); 
        res.status(409).json({ error: error.message }); 
      } else {
        logger.error(`Error during admin signup: ${error.message}`);
        res.status(400).json({ error: error.message });
      }
    } else {
      logger.error('Unexpected error during admin signup');
      res.status(400).json({ error: "An unexpected error occurred" });
    }
  }
};
