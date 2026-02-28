import { DataSource } from 'typeorm';
import { ENV } from './env';
import { User, Otp, Influencer, Client, Cart, CartItem } from '../entity';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: ENV.DB_HOST,
    port: parseInt(ENV.DB_PORT),
    username: ENV.DB_USERNAME,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_DATABASE,
    synchronize: true,
    logging: false,
    entities: [User, Otp, Influencer, Client, Cart, CartItem],
    migrations: ['src/migration/**/*.ts'],
    subscribers: ['src/subscriber/**/*.ts'],
    ssl: {
        rejectUnauthorized: false,
    },
});
