import { Request, Response } from 'express';
import { searchInfluencerPRByName, searchPackageByHeader } from '../services/searchService';
import logger from '../config/logger';

export const searchInfluencerPR = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== 'string') {
      logger.warn('Missing or invalid required search parameter: search');
      return res.status(400).json({ error: 'Missing or invalid required search parameter: search' });
    }

    const results = await searchInfluencerPRByName(search);
    logger.info(`Search for name "${search}" returned ${results.length} results`);
    return res.status(200).json(results);
  } catch (error: any) {
    logger.error(`Error during search: ${error.message}`);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

export const searchPackage = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== 'string') {
      logger.warn('Missing or invalid required search parameter: search');
      return res.status(400).json({ error: 'Missing or invalid required search parameter: search' });
    }

    const results = await searchPackageByHeader(search);

    const formattedResults = results.map(header => ({
      header: header.header,
      cost: header.cost,
      text1: header.text1,
      text2: header.text2,
      text3: header.text3,
      text4: header.text4,
      text5: header.text5,
      text6: header.text6,
      text7: header.text7,
      packages: header.packages.map(pkg => ({
        media: pkg.media,
        link: pkg.link,
        format: pkg.format,
        monthlyTraffic: pkg.monthlyTraffic,
        turnaroundTime: pkg.turnaroundTime
      }))
    }));

    logger.info(`Search for header "${search}" returned ${results.length} results`);
    return res.status(200).json(formattedResults);
  } catch (error: any) {
    logger.error(`Error during search: ${error.message}`);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};
