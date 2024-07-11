
import { Request, Response } from 'express';
import { createUser, getUserDetailsById, deactivateUserById } from '../../services/v1/userService';
import logger from '../../config/logger';


// create a signp ser
export const signup = async (req: Request, res: Response) => {
  const { email, password, fullname, type } = req.body;

  if (!email || !password || !fullname || !type) {
    logger.warn('Missing required fields in signup request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { user, message } = await createUser(email, password, fullname, type);
    logger.info(`User created/updated successfully: ${user?.id}`);
    return res.status(201).json({ user, message });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User already exists and is inactive') {
        logger.warn(`Signup attempt with existing inactive user: ${email}`);
        return res.status(409).json({ error: error.message });
      } else {
        logger.error(`Error during signup: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
    } else {
      logger.error('An unknown error occurred during signup');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};



//get User profile information

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    // Extract userId from query and validate
    const { userId } = req.params;

    if (typeof userId !== 'string') {
      logger.warn('Invalid or missing userId query parameter');
      return res.status(400).json({ error: 'Invalid or missing userId' });
    }

    // Fetch user details by ID
    const user = await getUserDetailsById(userId);

    if (!user) {
      logger.warn(`User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Destructure only the required fields from the user object
    const { email, fullname } = user;
    return res.status(200).json({ email, fullname });
  } catch (error) {
    if (error instanceof Error) {
      // Handle unexpected errors
      logger.error(`Error fetching user details: ${error.message}`);
      return res.status(500).json({ error: 'An unexpected error occurred' });
    } else {
      // Handle cases where error is not an instance of Error
      logger.error('An unknown error occurred while fetching user details');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};




// Deactive the profile
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    // Extract userId from the request body and validate
    const { userId } = req.params;

    if (typeof userId !== 'string') {
      logger.warn('Invalid or missing userId in request body');
      return res.status(400).json({ error: 'Invalid or missing userId' });
    }

    // Deactivate the user and handle related records
    await deactivateUserById(userId);
    logger.info(`User deactivated and related records deleted: ${userId}`);
    return res.status(200).json({ message: 'User deactivated successfully' });
  } catch (error: any) {
    // Log and handle known errors
    logger.error(`Error during user deactivation: ${error.message}`);
    if (error.message === 'User not found or already inactive') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};
