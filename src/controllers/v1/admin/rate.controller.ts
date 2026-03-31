import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getExchangeRateRatioWithFallback } from '../../../services/v1/admin/rate.service';

export const getExchangeRateController = async (req: Request, res: Response) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    if (!from || !to) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Missing params. Use: /admin/rate?from=INR&to=USD',
      });
    }

    const { ratio, source } = await getExchangeRateRatioWithFallback(from, to);

    return res.status(HttpStatus.OK).json({
      success: true,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      ratio,
      source,
    });
  } catch (error: any) {
    const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
    logger.error(`Admin get exchange rate error (${status}): ${error.message}`);
    return res.status(status).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

