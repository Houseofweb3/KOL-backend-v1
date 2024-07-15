
import { Request, Response } from 'express';
import { createUser, getUserDetailsById, deactivateUserById, loginUser, refreshTokenService } from '../../services/v1/userService';
import logger from '../../config/logger';


// create a signp User
export const signup = async (req: Request, res: Response) => {
  const { email, password, fullname, type } = req.body;

  if (!email || !password || !fullname || !type) {
    logger.warn('Missing required fields in signup request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { user, message, token, refreshToken } = await createUser(email, password, fullname, type);
    logger.info(`User created/updated successfully: ${user?.id}`);
    return res.status(201).json({ user, message, accessToken: token, refreshToken });
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




// Login User 
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input fields
  if (!email || !password) {
    logger.warn('Missing required fields in login request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call the service function to handle the login logic
    const { user, message, token, refreshToken } = await loginUser(email, password);

    // Log successful login
    logger.info(`User logged in successfully: ${user.id}`);

    // Respond with user details and token
    return res.status(200).json({ user, message, accessToken: token, refreshToken });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        logger.warn(`Login attempt for non-existent user: ${email}`);
        return res.status(404).json({ error: error.message });
      } else if (error.message === 'User is inactive') {
        logger.warn(`Login attempt for inactive user: ${email}`);
        return res.status(403).json({ error: error.message });
      } else if (error.message === 'Invalid password') {
        logger.warn(`Invalid password attempt for email: ${email}`);
        return res.status(401).json({ error: error.message });
      } else {
        logger.error(`Error during login: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
    } else {
      logger.error('An unknown error occurred during login');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Refresh Token
export const refreshTokenhandler = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // Validate input fields
  if (!refreshToken) {
    logger.warn('Refresh token is missing');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call the service function to handle the login logic
    const { newAccessToken } = await refreshTokenService(refreshToken);

    logger.info('Refresh token processed successfully');

    // Respond with the new access token
    return res.status(200).json({ newAccessToken });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Refresh token is required') {
        logger.warn('Refresh token missing in request');
        return res.status(400).json({ error: error.message });
      } else if (error.message === 'Invalid refresh token') {
        logger.warn('Invalid refresh token provided');
        return res.status(401).json({ error: error.message });
      } else {
        logger.error(`Error during token refresh: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
    } else {
      logger.error('An unknown error occurred during token refresh');
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
