import 'reflect-metadata';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import routes from './routes';
import logger from './config/logger';
import swaggerDocument from './swagger.json';
import { AppDataSource } from "./data-source";
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import questionRoutes from './routes/questionRoutes'
import userSelectedNicheRoutes from './routes/userSelectedNicheRoutes';
import userSelectedOptionsRoutes from './routes/userSelectedOptionsRoutes';
import influncereRouter from './routes/influencerRoutes';
import packageRouter from './routes/packageRoutes';
import cartRouter from './routes/cartRoutes';
import checkoutRouter from './routes/checkoutRoutes';
import invoiceRouter from './routes/invoiceRoutes'

const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const options = {
    swaggerDefinition: swaggerDocument,
    apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(express.json());  // Ensure body-parser middleware is used
app.use('/api', routes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes)
app.use('/admin/question', questionRoutes);
app.use('/user/niche', userSelectedNicheRoutes);
app.use('/user/influncer/type', userSelectedOptionsRoutes);
app.use('/admin/influncer', influncereRouter);
app.use('/user/influncer', influncereRouter);
app.use('/admin/package', packageRouter);
app.use('/user/package', packageRouter);
app.use('/user/cart', cartRouter);
app.use('/user/checkout', checkoutRouter);
app.use('/user/invoice', invoiceRouter)


app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

// Initialize TypeORM and then start the server
AppDataSource.initialize().then(() => {
    console.log("TypeORM connected");

    const server: HttpServer = createServer(app);

    server.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
}).catch(error => console.log("TypeORM connection error: ", error));
