import { Request, Response } from 'express';
import { addProductToCartService, addPackageToCartService, getUserCartDetailsService } from '../services/cartService';

export const addProductToInfluencerCart = async (req: Request, res: Response): Promise<Response> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { influencer_id, user_id } = req.body;

    if (!influencer_id || !user_id) {
      return res.status(400).json({ error: 'influencer_id and user_id are required' });
    }

    const startTime = Date.now();
    const message = await addProductToCartService(user_id, influencer_id);
    const endTime = Date.now();
    const responseTimeInMilliseconds = endTime - startTime;
    const responseTimeInSeconds = responseTimeInMilliseconds / 1000;
    console.log(`Response time: ${responseTimeInSeconds.toFixed(2)} seconds`);

    return res.status(200).json({ message });
  } catch (error: any) {
    console.error('Error adding product to cart:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add product to cart' });
  }
};

export const addPackageToCart = async (req: Request, res: Response): Promise<Response> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { user_id, package_id } = req.body;

    if (!user_id || !package_id) {
      return res.status(400).json({ message: 'user_id and package_id are required' });
    }

    const message = await addPackageToCartService(user_id, package_id);

    return res.status(201).json({ message });
  } catch (error: any) {
    console.error('Error adding package to cart:', error);
    return res.status(500).json({ message: 'Error adding package to cart', error: error.message });
  }
};

export const getUserCartDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { user_id } = req.query;
  
      if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
      }
  
      const cartDetails = await getUserCartDetailsService(user_id as string);
  
      return res.status(200).json(cartDetails);
    } catch (error: any) {
      console.error('Error fetching user cart details:', error);
      return res.status(500).json({ message: 'Error fetching user cart details', error: error.message });
    }
  };