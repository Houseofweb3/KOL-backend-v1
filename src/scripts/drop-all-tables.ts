/**
 * One-time script: drops all tables in the public schema (PostgreSQL).
 * Run before starting the app fresh so TypeORM synchronize can recreate tables.
 *
 * Usage: npx ts-node src/scripts/drop-all-tables.ts
 */
import { DataSource } from 'typeorm';
import { ENV } from '../config/env';

async function dropAllTables() {
    const ds = new DataSource({
        type: 'postgres',
        host: ENV.DB_HOST,
        port: parseInt(ENV.DB_PORT),
        username: ENV.DB_USERNAME,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_DATABASE,
        synchronize: false,
        logging: true,
        entities: [],
        ssl: { rejectUnauthorized: false },
    });

    await ds.initialize();
    console.log('Connected. Dropping public schema (all tables)...');

    await ds.query('DROP SCHEMA public CASCADE;');
    await ds.query('CREATE SCHEMA public;');
    await ds.query('GRANT ALL ON SCHEMA public TO postgres;');
    await ds.query('GRANT ALL ON SCHEMA public TO public;');

    await ds.destroy();
    console.log('Done. All tables dropped. Start the app to recreate schema.');
}

dropAllTables().catch((err) => {
    console.error(err);
    process.exit(1);
});
