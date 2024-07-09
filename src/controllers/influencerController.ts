// import { Request, Response } from 'express';
// import { uploadCSV, getInfluencersWithHiddenPrices } from '../services/influencerService';
// import logger from '../config/logger';

// export const uploadCSVHandler = async (req: Request, res: Response) => {
//   try {
//     const adminId = req.body.adminId;

//     if (!req.file) {
//       logger.warn('No file uploaded for CSV processing');
//       return res.status(400).json({ message: 'No file uploaded' });
//     }

//     const { insertedRows, skippedRows, skippedReasons } = await uploadCSV(req.file.path, adminId);
//     logger.info(`CSV uploaded by admin: ${adminId}. Inserted: ${insertedRows}, Skipped: ${skippedRows}`);

//     return res.status(200).json({
//       message: 'Data saved successfully 👍',
//       insertedRows,
//       skippedRows,
//       skippedReasons
//     });
//   } catch (error: any) {
//     logger.error('Error uploading CSV:', error);
//     if (error instanceof Error) {
//       return res.status(500).json({ message: 'Error saving data', error: error.message });
//     } else {
//       return res.status(500).json({ message: 'Unexpected error', error: String(error) });
//     }
//   }
// };

// export const getInfluencersWithHiddenPricesHandler = async (req: Request, res: Response) => {
//   try {
//     const { user_id } = req.query;

//     if (!user_id) {
//       logger.warn('Missing required parameter user_id for fetching influencers with hidden prices');
//       return res.status(400).json({ message: 'Missing required parameter' });
//     }

//     const influencersWithHiddenPrices = await getInfluencersWithHiddenPrices(user_id as string);
//     logger.info(`Fetched influencers with hidden prices for user: ${String(user_id)}`);

//     return res.status(200).json(influencersWithHiddenPrices);
//   } catch (error: any) {
//     logger.error('Error fetching influencers with hidden prices:', error);
//     if (error.message === 'User is not active') {
//       return res.status(403).json({ message: error.message });
//     } else {
//       return res.status(500).json({ message: 'Error fetching data', error: error.message });
//     }
//   }
// };
