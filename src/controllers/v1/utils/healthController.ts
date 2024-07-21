import os from 'os';
import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';

export const healthCheck = (req: Request, res: Response) => {
    // Gather server metrics
    const serverMetrics = {
        uptime: process.uptime(),  // Uptime in seconds
        memoryUsage: process.memoryUsage(),  // Memory usage statistics
        cpuUsage: process.cpuUsage(),  // CPU usage statistics
        loadAverage: os.loadavg(),  // Load averages (1, 5, and 15 minutes)
        totalMemory: os.totalmem(),  // Total system memory
        freeMemory: os.freemem(),  // Free system memory
        platform: os.platform(),  // Operating system platform
        architecture: os.arch(),  // CPU architecture
        cpus: os.cpus().length,  // Number of CPUs
        hostname: os.hostname()  // Hostname of the server
    };

    // Log server metrics
    logger.info('Server metrics:', serverMetrics);

    const responsePayload = {
        status: 'UP',
        message: 'Health check passed.',
        metrics: serverMetrics  // Include server metrics in the response
    };

    // Send response
    res.status(HttpStatus.OK).json(responsePayload);
};
