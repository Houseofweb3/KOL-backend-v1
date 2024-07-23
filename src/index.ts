import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer, Server as HttpServer } from 'http';
import express, { Application, Request, Response } from 'express';

import { ENV } from "./config/env";
import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from './config/data-source';

// Import CORS middleware
import corsMiddleware from './middleware/cors';

// Importing routes
import cartRoutes from './routes/v1/cart.routes';
import optionRoutes from './routes/v1/option.routes';
import userRoutes from './routes/v1/auth/user.routes';
import packageRoutes from './routes/v1/package.routes';
import checkoutRoutes from './routes/v1/checkoutRoutes';
import questionRoutes from './routes/v1/question.routes';
import utilsRoutes from './routes/v1/utils/utils.routes';
import influencerRoutes from './routes/v1/influencer.routes';
import invoiceRoutes from './routes/v1/payment/invoiceRoutes';
import packageItemRoutes from './routes/v1/packageItem.routes';
import packageCartItemRoutes from './routes/v1/packageCartItem.routes';
import influencerCartItemRoutes from './routes/v1/influencerCartItem.routes';
import onboardingQuestionsRoutes from './routes/v1/onboardingQuestions.routes';
import userOnboardingSelectionRoutes from './routes/v1/userOnboardingSelection.routes';



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

// utils Routes
app.use(`/api/v${ENV.VERSION}/utils`, utilsRoutes);

// Dummy API
app.get('/', (req: Request, res: Response) => {
    res.send('It is working');
});

// Initialize TypeORM data source
AppDataSource.initialize().then(() => {
    logger.info('Database connected successfully');

    const server: HttpServer = createServer(app);

    server.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
}).catch(error => {
    logger.error('Database connection failed:', error);
});
