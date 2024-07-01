import { Request, Response } from 'express';
import { uploadCSV, getInfluencersWithHiddenPrices } from '../services/influencerService';

export const uploadCSVHandler = async (req: Request, res: Response) => {
  try {
    const adminId = req.body.adminId;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { insertedRows, skippedRows, skippedReasons } = await uploadCSV(req.file.path, adminId);

    res.status(200).json({
      message: 'Data saved successfully',
      insertedRows,
      skippedRows,
      skippedReasons
    });
  } catch (error: any) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error saving data', error: error.message });
    } else {
      res.status(500).json({ message: 'Unexpected error', error: String(error) });
    }
  }
};

export const getInfluencersWithHiddenPricesHandler = async (req: Request, res: Response) => {
    try {
      const { user_id } = req.query;
  
      if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
      }
  
      const influencersWithHiddenPrices = await getInfluencersWithHiddenPrices(user_id as string);
      res.status(200).json(influencersWithHiddenPrices);
    } catch (error: any) {
      if (error.message === 'User is not active') {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Error fetching data', error: error.message });
      }
    }
  };