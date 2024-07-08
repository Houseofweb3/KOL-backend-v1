// import { Request, Response } from 'express';
// import { createUser, getUserDetailsById, deactivateUserById } from '../services/userService';
// import logger from '../config/logger';

// export const signup = async (req: Request, res: Response) => {
//   try {
//     const { id, email, password, fullname } = req.body;

//     if (!id || !email || !password || !fullname) {
//       logger.warn('Missing required fields in signup request');
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     const { user, message } = await createUser(id, email, password, fullname);
//     logger.info(`User created/updated successfully: ${id}`);
//     return res.status(201).json({ user, message });
//   } catch (error: any) {
//     if (error instanceof Error) {
//       if (error.message === 'User already exists' || error.message === 'User already exists and is active') {
//         logger.warn(`Signup attempt with existing user: ${req.body.email}`);
//         return res.status(409).json({ error: error.message });
//       } else {
//         logger.error(`Error during signup: ${error.message}`);
//         return res.status(400).json({ error: error.message });
//       }
//     } else {
//       logger.error('Unexpected error during signup');
//       return res.status(500).json({ error: 'An unexpected error occurred' });
//     }
//   }
// };

// export const getUserProfile = async (req: Request, res: Response) => {
//   try {
//     const { user_id } = req.query;

//     if (!user_id || typeof user_id !== 'string') {
//       logger.warn('Missing or invalid required query parameter: user_id');
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     const user = await getUserDetailsById(user_id);

//     if (!user) {
//       logger.warn(`User not found: ${user_id}`);
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const { email, fullname, password } = user;
//     return res.status(200).json({ email, fullname, password });
//   } catch (error: any) {
//     logger.error(`Error fetching user details: ${error.message}`);
//     return res.status(500).json({ error: 'An unexpected error occurred' });
//   }
// };

// export const deactivateUser = async (req: Request, res: Response) => {
//   try {
//     const { user_id } = req.body;

//     if (!user_id || typeof user_id !== 'string') {
//       logger.warn('Missing or invalid required body parameter: user_id');
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     await deactivateUserById(user_id);
//     logger.info(`User deactivated and related records deleted: ${user_id}`);
//     return res.status(200).json({ message: 'User deactivated 👍' });
//   } catch (error: any) {
//     logger.error(`Error during user deactivation: ${error.message}`);
//     if (error.message === 'User not found or already inactive') {
//       return res.status(404).json({ error: error.message });
//     }
//     return res.status(500).json({ error: 'An unexpected error occurred' });
//   }
// };