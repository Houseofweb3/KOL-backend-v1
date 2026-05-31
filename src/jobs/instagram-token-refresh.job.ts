import cron from 'node-cron';
import logger from '../config/logger';
import { refreshExpiringInstagramAccounts } from '../services/v1/web/instagram-auth.service';

/**
 * Daily cron that refreshes Instagram long-lived tokens before they expire.
 *
 * Instagram long-lived tokens last 60 days and can only be refreshed while still
 * valid. This job runs once a day and refreshes any connected account whose token
 * expires within the next 2 days, re-fetching profile + demographics in the process
 * so stored stats stay current. Safe in-process because PM2 runs a single fork
 * instance (see ecosystem.config.cjs).
 */
const SCHEDULE = '0 3 * * *'; // every day at 03:00 server time

export function startInstagramTokenRefreshCron(): void {
    cron.schedule(SCHEDULE, async () => {
        logger.info('IG token refresh cron: starting daily run');
        try {
            await refreshExpiringInstagramAccounts();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`IG token refresh cron failed: ${message}`);
        }
    });
    logger.info(`IG token refresh cron scheduled (${SCHEDULE})`);
}
