import { AppDataSource } from '../../../config/data-source';

/**
 * Table names used by the app (must match entity @Entity() names).
 * Order: child tables first to satisfy FK; CASCADE will handle dependents.
 */
const TABLES = [
    'tasks',
    'billing_info',
    'proposal_links',
    'cart_items',
    'carts',
    'clients',
    'influencers',
    'otps',
    'users',
] as const;

export interface WipeDatabaseResult {
    success: boolean;
    message: string;
    tablesTruncated: number;
}

/**
 * Delete all rows from all application tables. Uses TRUNCATE ... RESTART IDENTITY CASCADE.
 * Use only in dev/staging or when explicitly intended (e.g. reset environment).
 */
export async function wipeDatabase(): Promise<WipeDatabaseResult> {
    const tablesList = TABLES.join(', ');
    await AppDataSource.query(
        `TRUNCATE TABLE ${tablesList} RESTART IDENTITY CASCADE;`
    );
    return {
        success: true,
        message: 'All application data has been deleted.',
        tablesTruncated: TABLES.length,
    };
}
