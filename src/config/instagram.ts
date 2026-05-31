import { ENV } from './env';

/**
 * Instagram Login (instagram.com OAuth) configuration.
 *
 * Credentials come from "Instagram → API setup with Instagram login" in the Meta
 * dashboard, NOT from App Settings → Basic (those are the app-level credentials and
 * will fail this flow). The same screen is where the OAuth redirect URI and scopes
 * are registered — IG_REDIRECT_URI must match exactly.
 */
export const instagramConfig = {
    appId: ENV.IG_APP_ID,
    appSecret: ENV.IG_APP_SECRET,
    redirectUri: ENV.IG_REDIRECT_URI,
    scopes: ENV.IG_SCOPES,
    /** Graph host for profile + insights calls. */
    graph: 'https://graph.instagram.com/v22.0',
    /** OAuth hosts (separate from the graph host). */
    authorizeUrl: 'https://www.instagram.com/oauth/authorize',
    shortTokenUrl: 'https://api.instagram.com/oauth/access_token',
    longTokenUrl: 'https://graph.instagram.com/access_token',
    refreshTokenUrl: 'https://graph.instagram.com/refresh_access_token',
} as const;

/** Throws (500) if required Instagram credentials are not configured. Call before hitting the OAuth flow. */
export const assertInstagramConfig = (): void => {
    const missing = (['appId', 'appSecret', 'redirectUri'] as const).filter((k) => !instagramConfig[k]);
    if (missing.length > 0) {
        const err = new Error(
            `Instagram Login is not configured (missing: ${missing
                .map((k) => `IG_${k === 'appId' ? 'APP_ID' : k === 'appSecret' ? 'APP_SECRET' : 'REDIRECT_URI'}`)
                .join(', ')})`
        ) as Error & { status?: number };
        err.status = 500;
        throw err;
    }
};
