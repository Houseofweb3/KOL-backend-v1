import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer, Server as HttpServer } from 'http';
import express, { Application, Request, Response } from 'express';

import { ENV } from './config/env';
import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from './config/data-source';

// Import CORS middleware
import corsMiddleware from './middleware/cors';

// Importing routes
import { cartRoutes } from './routes';
import { optionRoutes } from './routes';
import { userRoutes } from './routes';
import { packageRoutes } from './routes';
import { checkoutRoutes } from './routes';
import { questionRoutes } from './routes';
import { utilsRoutes } from './routes';
import { influencerRoutes } from './routes';
import { invoiceRoutes } from './routes';
import { packageItemRoutes } from './routes';
import { packageCartItemRoutes } from './routes';
import { influencerCartItemRoutes } from './routes';
import { onboardingQuestionsRoutes } from './routes';
import { userOnboardingSelectionRoutes } from './routes';
import { couponRoutes } from './routes';

const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const options = {
    swaggerDefinition: swaggerDocument,
    apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

// Use CORS middleware
app.use(corsMiddleware);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// v1 Routes
// user auth routes
app.use(`/api/v${ENV.VERSION}/auth`, userRoutes);
// questionRoutes
app.use(`/api/v${ENV.VERSION}/questions`, questionRoutes);
// optionRoutes
app.use(`/api/v${ENV.VERSION}/options`, optionRoutes);
// onboarding-questions routes
app.use(`/api/v${ENV.VERSION}/onboarding-questions`, onboardingQuestionsRoutes);
// user-onboarding-selections routes
app.use(`/api/v${ENV.VERSION}/user-onboarding-selections`, userOnboardingSelectionRoutes);
// InfluencerRoutes
app.use(`/api/v${ENV.VERSION}/influencer`, influencerRoutes);
// package Routes
app.use(`/api/v${ENV.VERSION}/packages`, packageRoutes);
// Package Item Routes
app.use(`/api/v${ENV.VERSION}/package-items`, packageItemRoutes);
// Cart Routes
app.use(`/api/v${ENV.VERSION}/cart`, cartRoutes);
// influencer Cart Item Routes
app.use(`/api/v${ENV.VERSION}/influencer-cart-item`, influencerCartItemRoutes);
// package Cart Item Routes
app.use(`/api/v${ENV.VERSION}/package-cart-item`, packageCartItemRoutes);
// checkout Routes
app.use(`/api/v${ENV.VERSION}/checkout`, checkoutRoutes);
// invoice Routes
app.use(`/api/v${ENV.VERSION}/invoice`, invoiceRoutes);

// coupon Routes
app.use(`/api/v${ENV.VERSION}/coupons`, couponRoutes);
// utils Routes
app.use(`/api/v${ENV.VERSION}/utils`, utilsRoutes);

// Dummy API
app.get('/', (req: Request, res: Response) => {
    res.send('It is working');
});

// Initialize TypeORM data source
AppDataSource.initialize()
    .then(() => {
        logger.info('Database connected successfully');

        const server: HttpServer = createServer(app);

        server.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        });
    })
    .catch((error) => {
        logger.error('Database connection failed:', error);
    });
