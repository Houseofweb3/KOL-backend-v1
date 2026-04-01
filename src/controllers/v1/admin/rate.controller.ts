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
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error && 'status' in error
        ? ((error as { status?: number }).status || HttpStatus.INTERNAL_SERVER_ERROR)
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error(`Admin get exchange rate error (${status}): ${message}`);
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
};

