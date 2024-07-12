import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';

import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from './config/data-source';
import userRoutes from './routes/v1/userRoutes'
import questionRoutes from './routes/v1/questionRoutes'
import optionRoutes from './routes/v1/optionRoutes'
import onboardingQuestionsRoutes from './routes/v1/onboardingQuestionsRoutes';
import userOnboardingSelectionRoutes from './routes/v1/userOnboardingSelectionRoutes'
import influencerRoutes from './routes/v1/InfluencerRoutes'
import packageRoutes from './routes/v1/packageRoutes'
import packageItemRoutes from './routes/v1/packageItemRoutes'
import cartRoutes from './routes/v1/cartRoutes'
import influencerCartItemRoutes from './routes/v1/influencerCartItemRoutes'
import packageCartItemRoutes from './routes/v1/packageCartItemRoutes'

const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const options = {
    swaggerDefinition: swaggerDocument,
    apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
// app.use('/api', routes);


// v1 Routes
//user auth routes
app.use('/api/v1', userRoutes);
//questionRoutes
app.use('/api/v1/questions', questionRoutes);
// optionRoutes
app.use('/api/v1/options', optionRoutes);
// onboarding-questions routes
app.use('/api/v1/onboarding-questions', onboardingQuestionsRoutes);
//user-onboarding-selections routes 
app.use('/api/v1/user-onboarding-selections', userOnboardingSelectionRoutes)
// InfluencerRoutes
app.use('/api/v1/influencer', influencerRoutes)
//package Routes
app.use('/api/v1/packages', packageRoutes)
// Package Item Routes
app.use('/api/v1/package-items', packageItemRoutes)
// Cart Routes
app.use('/api/v1/cart', cartRoutes)
// influencer Cart Item Routes
app.use('/api/v1/influencer-cart-item', influencerCartItemRoutes)
// package Cart Item Routes
app.use('/api/v1/package-cart-item', packageCartItemRoutes)


// Dummy API 
app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
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
