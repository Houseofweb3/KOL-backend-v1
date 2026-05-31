import crypto from 'crypto';
import HttpStatus from 'http-status-codes';
import { Between } from 'typeorm';
import logger from '../../../config/logger';
import { instagramConfig, assertInstagramConfig } from '../../../config/instagram';
import { encryptToken, decryptToken } from '../../../utils/token-crypto';
import { AppDataSource } from '../../../config/data-source';
import { InstagramAccount } from '../../../entity/instagram-account.entity';

/**
 * Instagram Login (instagram.com OAuth) flow.
 *
 * Round-trip: build authorize URL → user logs in → IG redirects to our callback with
 * ?code → exchange code for a short-lived token → exchange that for a 60-day token →
 * read profile + follower demographics. The long-lived token is encrypted before it
 * leaves this service so callers never handle plaintext.
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Account types that can return follower demographics (with 100+ followers). */
const DEMOGRAPHICS_ACCOUNT_TYPES = ['BUSINESS', 'CREATOR', 'MEDIA_CREATOR'];
const DEMOGRAPHICS_MIN_FOLLOWERS = 100;

/**
 * In-memory CSRF state store. Single-process only — swap for Redis/DB before running
 * more than one instance (PM2 fork mode runs one, so this is fine for now).
 */
const stateStore = new Map<string, number>();

function pruneExpiredStates(now: number): void {
    for (const [state, createdAt] of stateStore) {
        if (now - createdAt > STATE_TTL_MS) stateStore.delete(state);
    }
}

function httpError(message: string, status: number): Error & { status: number } {
    const err = new Error(message) as Error & { status: number };
    err.status = status;
    return err;
}

/** Minimal shapes of the Instagram JSON responses we read. */
interface ShortTokenResponse {
    access_token?: string;
    user_id?: string | number;
}
interface LongTokenResponse {
    access_token?: string;
    expires_in?: number;
}
interface ProfileResponse {
    user_id?: string;
    username?: string;
    account_type?: string;
    followers_count?: number;
    media_count?: number;
}
interface InsightsResponse {
    data?: Array<{
        total_value?: {
            breakdowns?: Array<{
                results?: Array<{ dimension_values?: string[]; value?: number }>;
            }>;
        };
    }>;
}

export interface DemographicEntry {
    key: string;
    value: number;
}

export interface InstagramSummary {
    igUserId: string;
    username: string;
    accountType: string;
    followersCount: number;
    mediaCount: number;
    topCountries?: DemographicEntry[];
    topCities?: DemographicEntry[];
    age?: DemographicEntry[];
    gender?: DemographicEntry[];
    note?: string;
}

export interface InstagramConnectResult {
    summary: InstagramSummary;
    /** Id of the persisted InstagramAccount row — frontend echoes igUserId, not this. */
    accountId: string;
}

/** Build the Instagram authorize URL and register a one-time CSRF state. */
export function buildInstagramOAuthUrl(): { url: string; state: string } {
    assertInstagramConfig();
    const now = Date.now();
    pruneExpiredStates(now);

    const state = crypto.randomBytes(16).toString('hex');
    stateStore.set(state, now);

    const url =
        `${instagramConfig.authorizeUrl}?` +
        new URLSearchParams({
            client_id: instagramConfig.appId,
            redirect_uri: instagramConfig.redirectUri,
            response_type: 'code',
            scope: instagramConfig.scopes,
            state,
        }).toString();

    return { url, state };
}

/** Validate and consume a CSRF state returned on the callback. Throws if missing/expired. */
export function consumeInstagramState(state: string | undefined): void {
    if (!state) throw httpError('Missing OAuth state', HttpStatus.BAD_REQUEST);
    const createdAt = stateStore.get(state);
    stateStore.delete(state);
    if (createdAt == null) throw httpError('Invalid or expired OAuth state', HttpStatus.BAD_REQUEST);
    if (Date.now() - createdAt > STATE_TTL_MS) throw httpError('OAuth state has expired', HttpStatus.BAD_REQUEST);
}

/** code → short-lived token (form-encoded POST). Returns token + IG user id. */
async function exchangeCodeForShortToken(code: string): Promise<{ shortToken: string; igUserId: string }> {
    const res = await fetch(instagramConfig.shortTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: instagramConfig.appId,
            client_secret: instagramConfig.appSecret,
            grant_type: 'authorization_code',
            redirect_uri: instagramConfig.redirectUri,
            code,
        }).toString(),
    });
    const data: ShortTokenResponse = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        logger.error(`IG short-token exchange failed: ${JSON.stringify(data)}`);
        throw httpError('Failed to exchange authorization code', HttpStatus.BAD_GATEWAY);
    }
    return { shortToken: data.access_token, igUserId: String(data.user_id) };
}

/**
 * short-lived → long-lived (60-day) token. Returns token + expiry.
 *
 * Note: the docs show this as a GET, but the live API now rejects GET on the token
 * endpoints ("Unsupported request - method type: get"), so we POST the params as a
 * form body (same as the code→short-token exchange).
 */
async function exchangeForLongToken(shortToken: string): Promise<{ longToken: string; expiresAt: Date }> {
    const url =
        `${instagramConfig.longTokenUrl}?` +
        new URLSearchParams({
            grant_type: 'ig_exchange_token',
            client_secret: instagramConfig.appSecret,
            access_token: shortToken,
        }).toString();
    const res = await fetch(url);
    const data: LongTokenResponse = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        logger.error(`IG long-token exchange failed: status=${res.status} body=${JSON.stringify(data)}`);
        throw httpError('Failed to obtain long-lived token', HttpStatus.BAD_GATEWAY);
    }
    const expiresInSec = Number(data.expires_in) || 60 * 24 * 60 * 60;
    return { longToken: data.access_token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

/** Read the connected account's profile. */
async function fetchProfile(longToken: string): Promise<{
    user_id: string;
    username: string;
    account_type: string;
    followers_count: number;
    media_count: number;
}> {
    const url =
        `${instagramConfig.graph}/me?` +
        new URLSearchParams({
            fields: 'user_id,username,account_type,followers_count,media_count',
            access_token: longToken,
        }).toString();
    const res = await fetch(url);
    const data: ProfileResponse = await res.json().catch(() => ({}));
    if (!res.ok || !data.username) {
        logger.error(`IG profile fetch failed: ${JSON.stringify(data)}`);
        throw httpError('Failed to read Instagram profile', HttpStatus.BAD_GATEWAY);
    }
    return {
        user_id: String(data.user_id ?? ''),
        username: data.username,
        account_type: data.account_type ?? '',
        followers_count: Number(data.followers_count) || 0,
        media_count: Number(data.media_count) || 0,
    };
}

/** Demographics breakdowns we persist, keyed for both connect and refresh flows. */
interface EligibleDemographics {
    topCountries: DemographicEntry[];
    topCities: DemographicEntry[];
    age: DemographicEntry[];
    gender: DemographicEntry[];
}

/**
 * Fetch all follower-demographics breakdowns (country, city, age, gender) in parallel,
 * but only for Creator/Business accounts with 100+ followers (others return no data).
 * Returns null when the account is not eligible. Shared by connect + the refresh job.
 */
async function fetchEligibleDemographics(
    igUserId: string,
    longToken: string,
    accountType: string,
    followersCount: number
): Promise<EligibleDemographics | null> {
    if (!DEMOGRAPHICS_ACCOUNT_TYPES.includes(accountType) || followersCount < DEMOGRAPHICS_MIN_FOLLOWERS) {
        return null;
    }
    const [topCountries, topCities, age, gender] = await Promise.all([
        fetchDemographics(igUserId, longToken, 'country'),
        fetchDemographics(igUserId, longToken, 'city'),
        fetchDemographics(igUserId, longToken, 'age'),
        fetchDemographics(igUserId, longToken, 'gender'),
    ]);
    return { topCountries, topCities, age, gender };
}

/** Fetch a single follower-demographics breakdown (country | city | age | gender), sorted desc by value. */
async function fetchDemographics(igUserId: string, longToken: string, breakdown: string): Promise<DemographicEntry[]> {
    const url =
        `${instagramConfig.graph}/${igUserId}/insights?` +
        new URLSearchParams({
            metric: 'follower_demographics',
            period: 'lifetime',
            metric_type: 'total_value',
            breakdown,
            access_token: longToken,
        }).toString();
    const res = await fetch(url);
    const data: InsightsResponse = await res.json().catch(() => ({}));
    if (!res.ok) {
        // Insights can legitimately fail (too few followers, permission). Don't fail the whole connect.
        logger.warn(`IG demographics (${breakdown}) unavailable: ${JSON.stringify(data)}`);
        return [];
    }
    const results = data?.data?.[0]?.total_value?.breakdowns?.[0]?.results || [];
    return results
        .map((r) => ({ key: r.dimension_values?.[0], value: Number(r.value) || 0 }))
        .filter((r): r is DemographicEntry => r.key != null)
        .sort((a, b) => b.value - a.value);
}

/**
 * Complete the OAuth callback: exchange the code, read profile + demographics, and
 * return a summary plus the encrypted long-lived token for persistence.
 */
export async function connectInstagramAccount(code: string): Promise<InstagramConnectResult> {
    assertInstagramConfig();
    if (!code) throw httpError('Missing authorization code', HttpStatus.BAD_REQUEST);

    const { shortToken } = await exchangeCodeForShortToken(code);
    const { longToken, expiresAt } = await exchangeForLongToken(shortToken);
    const profile = await fetchProfile(longToken);
    const igUserId = profile.user_id;

    const summary: InstagramSummary = {
        igUserId,
        username: profile.username,
        accountType: profile.account_type,
        followersCount: profile.followers_count,
        mediaCount: profile.media_count,
    };

    const demographics = await fetchEligibleDemographics(
        igUserId,
        longToken,
        profile.account_type,
        profile.followers_count
    );
    if (demographics) {
        summary.topCountries = demographics.topCountries;
        summary.topCities = demographics.topCities;
        summary.age = demographics.age;
        summary.gender = demographics.gender;
    } else {
        summary.note = 'Demographics require a Creator/Business account with 100+ followers.';
    }

    logger.info(`IG connected: @${summary.username} (${igUserId}), followers=${summary.followersCount}`);

    // Persist (upsert by igUserId) BEFORE any influencer exists. Influencer rows created at
    // onboarding-submit time link back to this row via instagramAccountId. The token is
    // encrypted here so it is never stored in plaintext.
    const accountId = await upsertInstagramAccount(summary, encryptToken(longToken), expiresAt);

    return { summary, accountId };
}

/**
 * Upsert the connected account keyed by igUserId. Re-connecting refreshes the token,
 * profile, and demographics on the same row (idempotent — no duplicates).
 */
async function upsertInstagramAccount(
    summary: InstagramSummary,
    encryptedToken: string,
    tokenExpiresAt: Date
): Promise<string> {
    const repo = AppDataSource.getRepository(InstagramAccount);
    const existing = await repo.findOne({ where: { igUserId: summary.igUserId } });

    const fields = {
        igUserId: summary.igUserId,
        username: summary.username,
        accountType: summary.accountType,
        followersCount: summary.followersCount,
        mediaCount: summary.mediaCount,
        encryptedToken,
        tokenExpiresAt,
        demographics: {
            topCountries: summary.topCountries ?? [],
            topCities: summary.topCities ?? [],
            age: summary.age ?? [],
            gender: summary.gender ?? [],
        },
        isDeleted: false,
    };

    const account = existing ? repo.merge(existing, fields) : repo.create(fields);
    const saved = await repo.save(account);
    return saved.id;
}

/**
 * Resolve a connected Instagram account's row id from its igUserId. Used at
 * onboarding-submit time to stamp the FK onto newly created influencer rows.
 * Returns null if there is no (non-deleted) connected account.
 */
export async function findInstagramAccountIdByUserId(igUserId: string | null | undefined): Promise<string | null> {
    const id = igUserId?.trim();
    if (!id) return null;
    const repo = AppDataSource.getRepository(InstagramAccount);
    const account = await repo.findOne({ where: { igUserId: id } });
    if (!account || account.isDeleted) return null;
    return account.id;
}

// ---------------------------------------------------------------------------
// Disconnect / deauthorize / data deletion.
// Meta calls the deauthorize + data-deletion callbacks with a `signed_request`
// (base64url payload + HMAC-SHA256 signature keyed by the app secret). The app's
// own "Disconnect" button calls disconnectInstagramAccountByUserId directly.
// ---------------------------------------------------------------------------

function base64UrlDecode(input: string): Buffer {
    return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * Verify and decode a Meta `signed_request`. Returns the payload (with `user_id`) or
 * null if the signature doesn't match our app secret.
 */
export function parseSignedRequest(signedRequest: string | undefined): { user_id?: string } | null {
    if (!signedRequest || !signedRequest.includes('.')) return null;
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;
    try {
        const expected = crypto.createHmac('sha256', instagramConfig.appSecret).update(payload).digest();
        const provided = base64UrlDecode(encodedSig);
        if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
            logger.warn('IG signed_request signature mismatch');
            return null;
        }
        return JSON.parse(base64UrlDecode(payload).toString('utf8'));
    } catch (err) {
        logger.warn(`IG signed_request parse failed: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}

/**
 * Disconnect an account: soft-delete the row and clear the stored token so the
 * revoked token is not retained. Used by the in-app Disconnect button and by Meta's
 * deauthorize callback. Idempotent. Returns true if a row was found.
 */
export async function disconnectInstagramAccountByUserId(igUserId: string | null | undefined): Promise<boolean> {
    const id = igUserId?.trim();
    if (!id) return false;
    const repo = AppDataSource.getRepository(InstagramAccount);
    const account = await repo.findOne({ where: { igUserId: id } });
    if (!account) return false;
    repo.merge(account, { isDeleted: true, encryptedToken: '', tokenExpiresAt: null });
    await repo.save(account);
    logger.info(`IG account disconnected: igUserId=${id}`);
    return true;
}

/**
 * Permanently delete a connected account's data (Meta data-deletion request).
 * The Influencer FK is `onDelete: SET NULL`, so removing the row is safe.
 * Returns true if a row was removed.
 */
export async function deleteInstagramAccountByUserId(igUserId: string | null | undefined): Promise<boolean> {
    const id = igUserId?.trim();
    if (!id) return false;
    const repo = AppDataSource.getRepository(InstagramAccount);
    const account = await repo.findOne({ where: { igUserId: id } });
    if (!account) return false;
    await repo.remove(account);
    logger.info(`IG account data deleted: igUserId=${id}`);
    return true;
}

// ---------------------------------------------------------------------------
// Long-lived token refresh (daily cron). Instagram long-lived tokens last 60 days
// and can only be refreshed while still valid and at least 24h old. We refresh any
// account whose token expires within REFRESH_BEFORE_EXPIRY_MS, and on success also
// re-fetch the profile + demographics so stored stats stay current.
// ---------------------------------------------------------------------------

const REFRESH_BEFORE_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

interface RefreshTokenResponse {
    access_token?: string;
    expires_in?: number;
}

/**
 * Exchange a still-valid long-lived token for a fresh 60-day one. POST (not GET) for
 * the same reason as exchangeForLongToken — the live API rejects GET here.
 */
async function refreshLongToken(longToken: string): Promise<{ longToken: string; expiresAt: Date }> {
    const res = await fetch(instagramConfig.refreshTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'ig_refresh_token',
            access_token: longToken,
        }).toString(),
    });
    const data: RefreshTokenResponse = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        logger.error(`IG token refresh failed: ${JSON.stringify(data)}`);
        throw httpError('Failed to refresh long-lived token', HttpStatus.BAD_GATEWAY);
    }
    const expiresInSec = Number(data.expires_in) || 60 * 24 * 60 * 60;
    return { longToken: data.access_token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

/**
 * Refresh one account: rotate the token, then re-read profile + demographics so the
 * stored snapshot stays fresh. Persists the new encrypted token and expiry.
 */
async function refreshInstagramAccount(account: InstagramAccount): Promise<void> {
    const currentToken = decryptToken(account.encryptedToken);
    const { longToken, expiresAt } = await refreshLongToken(currentToken);

    const profile = await fetchProfile(longToken);
    const demographics = await fetchEligibleDemographics(
        profile.user_id,
        longToken,
        profile.account_type,
        profile.followers_count
    );

    const repo = AppDataSource.getRepository(InstagramAccount);
    repo.merge(account, {
        username: profile.username,
        accountType: profile.account_type,
        followersCount: profile.followers_count,
        mediaCount: profile.media_count,
        encryptedToken: encryptToken(longToken),
        tokenExpiresAt: expiresAt,
        demographics: demographics
            ? {
                  topCountries: demographics.topCountries,
                  topCities: demographics.topCities,
                  age: demographics.age,
                  gender: demographics.gender,
              }
            : account.demographics,
    });
    await repo.save(account);
}

/**
 * Find every connected account whose long-lived token expires within the next 2 days
 * (and is not already expired) and refresh each. One account's failure does not abort
 * the batch. Returns counts for logging. Invoked by the daily cron.
 */
export async function refreshExpiringInstagramAccounts(): Promise<{ total: number; refreshed: number; failed: number }> {
    const repo = AppDataSource.getRepository(InstagramAccount);
    const now = new Date();
    const threshold = new Date(now.getTime() + REFRESH_BEFORE_EXPIRY_MS);

    // Between is inclusive: token expires after now (still valid) and within the window.
    const accounts = await repo.find({
        where: {
            isDeleted: false,
            tokenExpiresAt: Between(now, threshold),
        },
    });

    let refreshed = 0;
    let failed = 0;
    for (const account of accounts) {
        try {
            await refreshInstagramAccount(account);
            refreshed += 1;
        } catch (err) {
            failed += 1;
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`IG token refresh failed for igUserId=${account.igUserId}: ${message}`);
        }
    }

    logger.info(`IG token refresh: ${accounts.length} due, ${refreshed} refreshed, ${failed} failed`);
    return { total: accounts.length, refreshed, failed };
}
