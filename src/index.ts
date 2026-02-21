import { createServer, Server as HttpServer } from 'http';
import express, { Application, Request, Response } from 'express';

import { ENV } from './config/env';
import logger from './config/logger';
import { AppDataSource } from './config/data-source';
import corsMiddleware from './middleware/cors';

import {
    cartRoutes,
    userRoutes,
    checkoutRoutes,
    checkoutPrRoutes,
    utilsRoutes,
    influencerRoutes,
    invoiceRoutes,
    packageCartItemRoutes,
    influencerCartItemRoutes,
    couponRoutes,
    adminInfluencerRoutes,
    adminClientRoutes,
    adminAuthRoutes,
    adminProposalRoutes,
    adminProposalPrRoutes,
    proposalClientRoutes,
    proposalClientPrRoutes,
    bountyRoutes,
    adminDashboardRoutes,
    dkRoutes,
    userProfileRoutes,
    bountyBookingRoutes,
    bountySubmissionRoutes,
    packageRoutes,
} from './routes';


const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiBase = `/api/v${ENV.VERSION}`;

app.use(`${apiBase}/auth`, userRoutes);
// app.use(`${apiBase}/questions`, questionRoutes);
// app.use(`${apiBase}/options`, optionRoutes);
// app.use(`${apiBase}/onboarding-questions`, onboardingQuestionsRoutes);
// app.use(`${apiBase}/user-onboarding-selections`, userOnboardingSelectionRoutes);
app.use(`${apiBase}/influencer`, influencerRoutes);
app.use(`${apiBase}/packages`, packageRoutes);
// app.use(`${apiBase}/package-items`, packageItemRoutes);
app.use(`${apiBase}/cart`, cartRoutes);
app.use(`${apiBase}/influencer-cart-item`, influencerCartItemRoutes);
app.use(`${apiBase}/package-cart-item`, packageCartItemRoutes);
app.use(`${apiBase}/checkout`, checkoutRoutes);
app.use(`${apiBase}/checkout-pr`, checkoutPrRoutes);
app.use(`${apiBase}/invoice`, invoiceRoutes);
app.use(`${apiBase}/coupons`, couponRoutes);
app.use(`${apiBase}/proposal`, proposalClientRoutes);
app.use(`${apiBase}/proposal-pr`, proposalClientPrRoutes);

app.use(`${apiBase}/admin/auth`, adminAuthRoutes);
app.use(`${apiBase}/admin/client`, adminClientRoutes);
app.use(`${apiBase}/admin/dashboard-details`, adminDashboardRoutes);
app.use(`${apiBase}/admin/influencer`, adminInfluencerRoutes);
app.use(`${apiBase}/admin/proposal`, adminProposalRoutes);
app.use(`${apiBase}/admin/dr`, dkRoutes);
app.use(`${apiBase}/admin/proposal-pr`, adminProposalPrRoutes);

app.use(`${apiBase}/user/bounty`, userProfileRoutes);
app.use(`${apiBase}/bounty`, bountyRoutes);
app.use(`${apiBase}/bounty-booking`, bountyBookingRoutes);
app.use(`${apiBase}/bounty-submission`, bountySubmissionRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.send('It is working');
});

AppDataSource.initialize()
    .then(() => {
        logger.info('Database connected successfully');
        const server: HttpServer = createServer(app);
        server.listen(port, () => logger.info(`Server is running on port ${port}`));
    })
    .catch((error) => {
        logger.error('Database connection failed:', error);
    });
