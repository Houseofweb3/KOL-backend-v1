import cron from 'node-cron';
import logger from '../config/logger';
import { refreshAllYoutubeAccounts } from '../services/v1/web/youtube-auth.service';

/**
 * Daily cron that refreshes connected YouTube channels' stats + demographics.
 *
 * Google access tokens last only ~1 hour, so (unlike Instagram's 60-day token) there is
 * no "expiring soon" window to chase — we simply re-mint an access token from each stored
 * refresh token and re-fetch the snapshot so stored stats stay current. Runs once a day.
 * Safe in-process because PM2 runs a single fork instance (see ecosystem.config.cjs).
 *
 * Note: while the OAuth app is in "Testing" mode, Google refresh tokens expire after 7
 * days, so refresh failures are expected for test users until the app is verified.
 */
const SCHEDULE = '30 3 * * *'; // every day at 03:30 server time (after the IG job)

export function startYoutubeTokenRefreshCron(): void {
  cron.schedule(SCHEDULE, async () => {
    logger.info('YT stats refresh cron: starting daily run');
    try {
      await refreshAllYoutubeAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`YT stats refresh cron failed: ${message}`);
    }
  });
  logger.info(`YT stats refresh cron scheduled (${SCHEDULE})`);
}
