import { Request, Response, NextFunction } from 'express';

/** Logs each request to terminal: method, path, status code, duration (ms). */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const method = req.method;
        const path = req.originalUrl || req.url;
        const statusColor =
            status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
        const reset = '\x1b[0m';
        console.log(`${method} ${path} ${statusColor}${status}${reset} ${duration}ms`);
    });

    next();
};
