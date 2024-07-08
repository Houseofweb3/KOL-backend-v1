// import { Request, Response } from 'express';
// import { addProductToCartService, addPackageToCartService, getUserCartDetailsService } from '../services/cartService';
// import logger from '../config/logger';

// export const addProductToInfluencerCart = async (req: Request, res: Response): Promise<Response> => {

//   try {
//     const { influencer_id, user_id } = req.body;

//     if (!influencer_id || !user_id) {
//       logger.warn('Missing required parameters for adding product to cart');
//       return res.status(400).json({ error: 'Missing required parameters' });
//     }

//     const message = await addProductToCartService(String(user_id), String(influencer_id));
//     logger.info(`Product added to cart for user: ${user_id}, influencer: ${influencer_id}`);

//     return res.status(200).json({ message });
//   } catch (error: any) {
//     logger.error('Error adding product to cart:', error);
//     return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add product to cart ❌' });
//   }
// };

// export const addPackageToCart = async (req: Request, res: Response): Promise<Response> => {

//   try {
//     const { user_id, package_id } = req.body;

//     if (!user_id || !package_id) {
//       logger.warn('Missing required parameters for adding package to cart');
//       return res.status(400).json({ message: 'Missing required parameters' });
//     }

//     const message = await addPackageToCartService(String(user_id), String(package_id));
//     logger.info(`Package added to cart for user: ${user_id}, package: ${package_id}`);

//     return res.status(201).json({ message });
//   } catch (error: any) {
//     logger.error('Error adding package to cart:', error);
//     return res.status(500).json({ message: 'Error adding package to cart ❌', error: error.message });
//   }
// };

// export const getUserCartDetails = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const { user_id } = req.query;

//     if (!user_id) {
//       logger.warn('Missing required parameters for fetching user cart details');
//       return res.status(400).json({ message: 'Missing required parameters' });
//     }

//     const cartDetails = await getUserCartDetailsService(String(user_id));
//     logger.info(`Fetched cart details for user: ${String(user_id)}`);

//     return res.status(200).json(cartDetails);
//   } catch (error: any) {
//     logger.error('Error fetching user cart details:', error);
//     return res.status(500).json({ message: 'Error fetching user cart details', error: error.message });
//   }
// };
