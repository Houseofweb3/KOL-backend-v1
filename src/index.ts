import { createServer, Server as HttpServer } from 'http';
import express, { Application, Request, Response } from 'express';

import { ENV } from './config/env';
import logger from './config/logger';
import { AppDataSource } from './config/data-source';
import { ensureKoalInvoiceNumberIndex } from './db/ensure-koal-invoice-indexes';
import corsMiddleware from './middleware/cors';
import { requestLogger } from './middleware/requestLogger';
import { indexRoutes } from './routes/v1/index';

const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

const apiBase = `/api/v${ENV.VERSION}`;

// All API routes live under routes/v1/ and are mounted at apiBase (e.g. /api/v1)
app.use(apiBase, indexRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.send('It is working');
});

AppDataSource.initialize()
    .then(async () => {
        await ensureKoalInvoiceNumberIndex();
        logger.info('Database connected successfully');
        const server: HttpServer = createServer(app);
        server.listen(port, () => logger.info(`Server is running on port ${port}`));
    })
    .catch((error) => {
        logger.error('Database connection failed:', error);
    });
