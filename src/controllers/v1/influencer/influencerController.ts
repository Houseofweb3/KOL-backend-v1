import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { setCorsHeaders } from '../../../middleware/setcorsHeaders';
import {
  uploadCSV,
  uploadNewFormatCSV,
  updateInfluencersFromCSV,
  createInfluencer,
  deleteInfluencer,
  deleteNewInfluencers,
  getFilterOptions,
  getInfluencersWithHiddenPrices
} from '../../../services/v1/influencer/influencerService';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_FIELD = 'price';
const DEFAULT_SORT_ORDER: 'ASC' | 'DESC' = 'ASC';

export const uploadCSVHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    if (!req.file) {
      logger.warn('No file uploaded for CSV processing');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
    }

    const { insertedRows, skippedRows, skippedReasons } = await uploadCSV(req.file.path);
    logger.info(`CSV uploaded. Inserted: ${insertedRows}, Skipped: ${skippedRows}`);

    return res.status(HttpStatus.OK).json({
      message: 'Data saved successfully 👍',
      insertedRows,
      skippedRows,
      skippedReasons
    });
  } catch (error: any) {
    logger.error('Error uploading CSV:', error);
    if (error instanceof Error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error saving data', error: error.message });
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Unexpected error', error: String(error) });
    }
  }
};

// Upload CSV with new format (Clippers format)
export const uploadNewFormatCSVHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    if (!req.file) {
      logger.warn('No file uploaded for new format CSV processing');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
    }

    const { insertedRows, skippedRows, skippedReasons } = await uploadNewFormatCSV(req.file.path);
    logger.info(`New format CSV uploaded. Inserted: ${insertedRows}, Skipped: ${skippedRows}`);

    return res.status(HttpStatus.OK).json({
      message: 'Data saved successfully 👍',
      insertedRows,
      skippedRows,
      skippedReasons
    });
  } catch (error: any) {
    logger.error('Error uploading new format CSV:', error);
    if (error instanceof Error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error saving data', error: error.message });
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Unexpected error', error: String(error) });
    }
  }
};

// Update existing influencers from CSV by name
export const updateInfluencersFromCSVHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    if (!req.file) {
      logger.warn('No file uploaded for CSV update processing');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded' });
    }

    const { updatedRows, skippedRows, skippedReasons } = await updateInfluencersFromCSV(req.file.path);
    logger.info(`CSV update processed. Updated: ${updatedRows}, Skipped: ${skippedRows}`);

    return res.status(HttpStatus.OK).json({
      message: 'Influencers updated successfully 👍',
      updatedRows,
      skippedRows,
      skippedReasons
    });
  } catch (error: any) {
    logger.error('Error updating influencers from CSV:', error);
    if (error instanceof Error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error updating data', error: error.message });
    } else {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Unexpected error', error: String(error) });
    }
  }
};

export const getFilterOptionsController = async (req: Request, res: Response) => {
  try {
    const filterOptions = await getFilterOptions();
    console.log(filterOptions, "filterOptions");

    res.json(filterOptions);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error fetching influencers with hidden prices:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching data', error: error.message });
    }
    else {
      logger.error('An unknown error occurred during OnBoardingQuestion creation');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
    }
  }
};

export const getInfluencersWithHiddenPricesHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    // Extract query parameters for pagination and sorting
    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const followerRange = req.query.followerRange as string || "";
    const priceRange = req.query.priceRange as string || "";
    const searchTerm = req.query.searchTerm as string || "";
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const sortField = (req.query.sortField as string) || 'createdAt'; // Default to createdAt if not provided
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC'; // Default to DESC for latest first
    const userId = req.query.userId as string;

    let filter: Record<string, any> = {}; // Use Record<string, any> for better type safety

    // Parse the filter query parameters safely
    try {
      filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
    } catch (error) {
      logger.error('Error parsing filter query parameter:', error);
      // Optionally return an error response or default to an empty filter
      filter = {};
    }

    // Fetch influencers using the service function with parsed filters
    const { influencers, pagination } = await getInfluencersWithHiddenPrices(
      userId,
      page,
      limit,
      sortField,
      sortOrder,
      searchTerm,
      filter,
      followerRange,
      priceRange
    );

    logger.info(`Fetched influencers with hidden prices for user with page ${page}, limit ${limit}`);

    return res.status(HttpStatus.OK).json({
      pagination,
      influencers,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error fetching influencers with hidden prices:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching data', error: error.message });
    } else {
      logger.error('An unknown error occurred during influencer fetching');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
    }
  }
};


// create inflencer
export const createInfluencerHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  const data = req.body;

  if (!data.name || !data.niche || !data.subscribers) {
    logger.warn('Missing required fields in create influencer request');
    return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing required fields' });
  }

  try {
    const { influencer, message } = await createInfluencer(data);
    logger.info(`Influencer created successfully: ${influencer.id}`);
    return res.status(HttpStatus.CREATED).json({ influencer, message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating influencer: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while creating influencer');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
    }
  }
};

//delete a inflencers
export const deleteInfluencerHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  const { id } = req.params;

  try {
    const { message } = await deleteInfluencer(id);
    return res.status(HttpStatus.OK).json({ message });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error deleting influencer: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while deleting influencer');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
    }
  }
};

// Delete all influencers where isNewInfluencer is true
export const deleteNewInfluencersHandler = async (req: Request, res: Response) => {
  setCorsHeaders(req, res);
  try {
    const { message, deletedCount } = await deleteNewInfluencers();
    logger.info(`Deleted ${deletedCount} new influencers`);
    return res.status(HttpStatus.OK).json({ message, deletedCount });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error deleting new influencers: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    } else {
      logger.error('An unknown error occurred while deleting new influencers');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'An unknown error occurred' });
    }
  }
};
