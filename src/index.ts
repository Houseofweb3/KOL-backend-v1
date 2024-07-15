import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer, Server as HttpServer } from 'http';
import express, {
    Application,
    Request,
    Response
} from 'express';

import { ENV } from "./config/env";
import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from './config/data-source';

import userRoutes from './routes/v1/user.routes';
import cartRoutes from './routes/v1/cart.routes';
import optionRoutes from './routes/v1/option.routes';
import packageRoutes from './routes/v1/package.routes';
import questionRoutes from './routes/v1/question.routes';
import influencerRoutes from './routes/v1/influencer.routes';
import packageItemRoutes from './routes/v1/packageItem.routes';
import packageCartItemRoutes from './routes/v1/packageCartItem.routes';
import influencerCartItemRoutes from './routes/v1/influencerCartItem.routes';
import onboardingQuestionsRoutes from './routes/v1/onboardingQuestions.routes';
import userOnboardingSelectionRoutes from './routes/v1/userOnboardingSelection.routes';
import checkoutRoutes from './routes/v1/checkoutRoutes';
import { verifyAccessToken } from './middleware/auth';
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

// v1 Routes
//user auth routes
app.use(`/api/v${ENV.VERSION}/auth`, userRoutes);
//questionRoutes
app.use(`/api/v${ENV.VERSION}/questions`, verifyAccessToken,  questionRoutes);
// optionRoutes
app.use(`/api/v${ENV.VERSION}/options`, verifyAccessToken, optionRoutes);
// onboarding-questions routes
app.use(`/api/v${ENV.VERSION}/onboarding-questions`, verifyAccessToken, onboardingQuestionsRoutes);
//user-onboarding-selections routes 
app.use(`/api/v${ENV.VERSION}/user-onboarding-selections`, verifyAccessToken,  userOnboardingSelectionRoutes)
// InfluencerRoutes
app.use(`/api/v${ENV.VERSION}/influencer`, verifyAccessToken, influencerRoutes)
//package Routes
app.use(`/api/v${ENV.VERSION}/packages`, verifyAccessToken, packageRoutes)
// Package Item Routes
app.use(`/api/v${ENV.VERSION}/package-items`, verifyAccessToken, packageItemRoutes)
// Cart Routes
app.use(`/api/v${ENV.VERSION}/cart`, verifyAccessToken, cartRoutes)
// influencer Cart Item Routes
app.use(`/api/v${ENV.VERSION}/influencer-cart-item`, verifyAccessToken, influencerCartItemRoutes)
// package Cart Item Routes
app.use(`/api/v${ENV.VERSION}/package-cart-item`, verifyAccessToken, packageCartItemRoutes)
// checkout Routes
app.use(`/api/v${ENV.VERSION}/checkout`, verifyAccessToken, checkoutRoutes)


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
