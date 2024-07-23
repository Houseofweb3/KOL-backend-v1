import { Request, Response } from 'express';
import { uploadCSV, getInfluencersWithHiddenPrices, createInfluencer, deleteInfluencer, getFilterOptions } from '../../services/v1/influencerService';
import logger from '../../config/logger';
import { setCorsHeaders } from '../../middleware/setcorsHeaders';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_FIELD = 'price';
const DEFAULT_SORT_ORDER: 'ASC' | 'DESC' = 'ASC';

export const uploadCSVHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    // const adminId = req.body.adminId;

    if (!req.file) {
      logger.warn('No file uploaded for CSV processing');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { insertedRows, skippedRows, skippedReasons } = await uploadCSV(req.file.path);
    logger.info(`CSV uploaded. Inserted: ${insertedRows}, Skipped: ${skippedRows}`);

    return res.status(200).json({
      message: 'Data saved successfully 👍',
      insertedRows,
      skippedRows,
      skippedReasons
    });
  } catch (error: any) {
    logger.error('Error uploading CSV:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Error saving data', error: error.message });
    } else {
      return res.status(500).json({ message: 'Unexpected error', error: String(error) });
    }
  }
};

export const getFilterOptionsController = async (req: Request, res: Response) => {
  try {
    const filterOptions = await getFilterOptions();
    res.json(filterOptions);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error fetching influencers with hidden prices:', error);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    }
    else {
      logger.error('An unknown error occurred during OnBoardingQuestion creation');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export const getInfluencersWithHiddenPricesHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    // Extract query parameters for pagination and sorting
    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const search = req.query.search as string || "";
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const sortField = (req.query.sortField as string) || DEFAULT_SORT_FIELD;
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || DEFAULT_SORT_ORDER;

    let filter: object = {};
    
    // Parse the filter query parameter safely
    try {
      filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
    } catch (error) {
      logger.error('Error parsing filter query parameter:', error);
      // Optionally return an error response or default to an empty filter
      filter = {};
    }

    const { influencers, pagination } = await getInfluencersWithHiddenPrices(page, limit, sortField, sortOrder, search, filter);
    logger.info(`Fetched influencers with hidden prices for user with page ${page}, limit ${limit}`);

    return res.status(200).json({
      pagination,
      influencers,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error fetching influencers with hidden prices:', error);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    }
    else {
      logger.error('An unknown error occurred during OnBoardingQuestion creation');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// create inflencer
export const createInfluencerHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  const data = req.body;

  if (!data.name || !data.niche || !data.subscribers) {
    logger.warn('Missing required fields in create influencer request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { influencer, message } = await createInfluencer(data);
    logger.info(`Influencer created successfully: ${influencer.id}`);
    return res.status(201).json({ influencer, message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating influencer: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while creating influencer');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

//delete a inflencers
export const deleteInfluencerHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  const { id } = req.params;

  try {
    const { message } = await deleteInfluencer(id);
    return res.status(200).json({ message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error deleting influencer: ${error.message}`);
      return res.status(500).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while deleting influencer');
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

