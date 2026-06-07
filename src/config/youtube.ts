import { ENV } from './env';

/**
 * YouTube Login (Google OAuth 2.0) configuration.
 *
 * Credentials come from a Google Cloud project's "Web application" OAuth client. The
 * project must have BOTH the "YouTube Data API v3" and "YouTube Analytics API" enabled,
 * and the consent screen must request youtube.readonly + yt-analytics.readonly so we can
 * read channel stats AND audience demographics. YT_REDIRECT_URI must match a redirect URI
 * registered on that OAuth client exactly.
 */
export const youtubeConfig = {
  clientId: ENV.YT_CLIENT_ID,
  clientSecret: ENV.YT_CLIENT_SECRET,
  redirectUri: ENV.YT_REDIRECT_URI,
  scopes: ENV.YT_SCOPES,
  /** Google OAuth endpoints. */
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  /** YouTube Data API v3 (channel snippet + statistics). */
  dataApi: 'https://www.googleapis.com/youtube/v3',
  /** YouTube Analytics API v2 (audience demographics: country, age, gender). */
  analyticsApi: 'https://youtubeanalytics.googleapis.com/v2',
} as const;

/** Throws (500) if required YouTube credentials are not configured. Call before hitting the OAuth flow. */
export const assertYoutubeConfig = (): void => {
  const missing = (['clientId', 'clientSecret', 'redirectUri'] as const).filter((k) => !youtubeConfig[k]);
  if (missing.length > 0) {
    const err = new Error(
      `YouTube Login is not configured (missing: ${missing
        .map((k) => `YT_${k === 'clientId' ? 'CLIENT_ID' : k === 'clientSecret' ? 'CLIENT_SECRET' : 'REDIRECT_URI'}`)
        .join(', ')})`
    ) as Error & { status?: number };
    err.status = 500;
    throw err;
  }
};
