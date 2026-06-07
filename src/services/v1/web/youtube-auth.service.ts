import crypto from 'crypto';
import HttpStatus from 'http-status-codes';
import logger from '../../../config/logger';
import { youtubeConfig, assertYoutubeConfig } from '../../../config/youtube';
import { encryptToken, decryptToken } from '../../../utils/token-crypto';
import { AppDataSource } from '../../../config/data-source';
import { YoutubeAccount } from '../../../entity/youtube-account.entity';

/**
 * YouTube Login (Google OAuth 2.0) flow.
 *
 * Round-trip: build authorize URL (access_type=offline + prompt=consent so Google returns
 * a refresh token) → user logs in → Google redirects to our callback with ?code → exchange
 * code for an access token + refresh token → read channel stats (Data API) + audience
 * demographics (Analytics API). The refresh token is encrypted before it leaves this
 * service so callers never handle plaintext.
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

/** Minimal shapes of the Google/YouTube JSON responses we read. */
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}
interface ChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; customUrl?: string };
    statistics?: {
      viewCount?: string;
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
      videoCount?: string;
    };
  }>;
}
interface AnalyticsResponse {
  columnHeaders?: Array<{ name?: string }>;
  rows?: Array<Array<string | number>>;
  error?: { message?: string };
}

export interface DemographicEntry {
  key: string;
  value: number;
}

export interface YoutubeSummary {
  channelId: string;
  title: string;
  customUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  topCountries?: DemographicEntry[];
  age?: DemographicEntry[];
  gender?: DemographicEntry[];
  note?: string;
}

export interface YoutubeConnectResult {
  summary: YoutubeSummary;
  /** Id of the persisted YoutubeAccount row — frontend echoes channelId, not this. */
  accountId: string;
}

/** Build the Google authorize URL and register a one-time CSRF state. */
export function buildYoutubeOAuthUrl(): { url: string; state: string } {
  assertYoutubeConfig();
  const now = Date.now();
  pruneExpiredStates(now);

  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, now);

  const url =
    `${youtubeConfig.authorizeUrl}?` +
    new URLSearchParams({
      client_id: youtubeConfig.clientId,
      redirect_uri: youtubeConfig.redirectUri,
      response_type: 'code',
      scope: youtubeConfig.scopes,
      state,
      // offline + consent are required for Google to return a refresh token every time.
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    }).toString();

  return { url, state };
}

/** Validate and consume a CSRF state returned on the callback. Throws if missing/expired. */
export function consumeYoutubeState(state: string | undefined): void {
  if (!state) throw httpError('Missing OAuth state', HttpStatus.BAD_REQUEST);
  const createdAt = stateStore.get(state);
  stateStore.delete(state);
  if (createdAt == null) throw httpError('Invalid or expired OAuth state', HttpStatus.BAD_REQUEST);
  if (Date.now() - createdAt > STATE_TTL_MS) throw httpError('OAuth state has expired', HttpStatus.BAD_REQUEST);
}

/** code → access token + refresh token (form-encoded POST). */
async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const res = await fetch(youtubeConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: youtubeConfig.clientId,
      client_secret: youtubeConfig.clientSecret,
      redirect_uri: youtubeConfig.redirectUri,
      grant_type: 'authorization_code',
      code,
    }).toString(),
  });
  const data: TokenResponse = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    logger.error(`YT token exchange failed: ${JSON.stringify(data)}`);
    throw httpError('Failed to exchange authorization code', HttpStatus.BAD_GATEWAY);
  }
  if (!data.refresh_token) {
    // Without offline access + consent Google omits the refresh token; we can't keep the
    // connection alive. This usually means the user previously granted without revoking.
    logger.warn('YT token exchange returned no refresh_token (access_type/prompt or prior grant).');
  }
  const expiresInSec = Number(data.expires_in) || 3600;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: new Date(Date.now() + expiresInSec * 1000),
  };
}

/** refresh token → a fresh access token (Google access tokens last ~1 hour). */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch(youtubeConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: youtubeConfig.clientId,
      client_secret: youtubeConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  const data: TokenResponse = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    logger.error(`YT access-token refresh failed: ${JSON.stringify(data)}`);
    throw httpError('Failed to refresh YouTube access token', HttpStatus.BAD_GATEWAY);
  }
  const expiresInSec = Number(data.expires_in) || 3600;
  return { accessToken: data.access_token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

/** Read the connected channel's snippet + statistics (the authorized user's own channel). */
async function fetchChannel(accessToken: string): Promise<{
  channelId: string;
  title: string;
  customUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}> {
  const url =
    `${youtubeConfig.dataApi}/channels?` +
    new URLSearchParams({ part: 'snippet,statistics', mine: 'true' }).toString();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data: ChannelsResponse = await res.json().catch(() => ({}));
  const channel = data.items?.[0];
  if (!res.ok || !channel?.id) {
    logger.error(`YT channel fetch failed: ${JSON.stringify(data)}`);
    throw httpError('Failed to read YouTube channel', HttpStatus.BAD_GATEWAY);
  }
  return {
    channelId: String(channel.id),
    title: channel.snippet?.title ?? '',
    customUrl: channel.snippet?.customUrl ?? '',
    subscriberCount: Number(channel.statistics?.subscriberCount) || 0,
    videoCount: Number(channel.statistics?.videoCount) || 0,
    viewCount: Number(channel.statistics?.viewCount) || 0,
  };
}

/** YYYY-MM-DD for the YouTube Analytics date range (last 365 days). */
function analyticsDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** Run a single YouTube Analytics report for the authorized channel. Returns rows or [] on failure. */
async function analyticsReport(
  accessToken: string,
  params: Record<string, string>
): Promise<Array<Array<string | number>>> {
  const { startDate, endDate } = analyticsDateRange();
  const url =
    `${youtubeConfig.analyticsApi}/reports?` +
    new URLSearchParams({ ids: 'channel==MINE', startDate, endDate, ...params }).toString();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data: AnalyticsResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Analytics can legitimately fail (too little data, permission). Don't fail the whole connect.
    logger.warn(`YT analytics (${params.dimensions}) unavailable: ${JSON.stringify(data.error || data)}`);
    return [];
  }
  return data.rows || [];
}

/** Strip the "age" prefix YouTube uses (age18-24 → 18-24). */
function normalizeAgeGroup(raw: string): string {
  return raw.replace(/^age/i, '');
}

/** Human-friendly gender label (female | male | user-specified). */
function normalizeGender(raw: string): string {
  const g = raw.toLowerCase();
  if (g.includes('female')) return 'Female';
  if (g.includes('male')) return 'Male';
  return 'Other';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface YoutubeDemographicsResult {
  topCountries: DemographicEntry[];
  age: DemographicEntry[];
  gender: DemographicEntry[];
}

/**
 * Fetch audience demographics: top countries (by views) and age/gender (viewer %). Age and
 * gender come from a single ageGroup×gender report which we aggregate two ways. Returns
 * null when no demographic data is available at all (new/low-traffic channels).
 */
async function fetchYoutubeDemographics(accessToken: string): Promise<YoutubeDemographicsResult | null> {
  const [ageGenderRows, countryRows] = await Promise.all([
    analyticsReport(accessToken, { dimensions: 'ageGroup,gender', metrics: 'viewerPercentage' }),
    analyticsReport(accessToken, { dimensions: 'country', metrics: 'views', sort: '-views', maxResults: '10' }),
  ]);

  const ageMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  for (const row of ageGenderRows) {
    const ageGroup = normalizeAgeGroup(String(row[0] ?? ''));
    const gender = normalizeGender(String(row[1] ?? ''));
    const pct = Number(row[2]) || 0;
    if (ageGroup) ageMap.set(ageGroup, (ageMap.get(ageGroup) || 0) + pct);
    genderMap.set(gender, (genderMap.get(gender) || 0) + pct);
  }

  const age: DemographicEntry[] = [...ageMap.entries()]
    .map(([key, value]) => ({ key, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
  const gender: DemographicEntry[] = [...genderMap.entries()]
    .map(([key, value]) => ({ key, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
  const topCountries: DemographicEntry[] = countryRows
    .map((row) => ({ key: String(row[0] ?? ''), value: Number(row[1]) || 0 }))
    .filter((r) => r.key);

  if (age.length === 0 && gender.length === 0 && topCountries.length === 0) return null;
  return { topCountries, age, gender };
}

/**
 * Complete the OAuth callback: exchange the code, read channel stats + demographics, and
 * persist the encrypted refresh token. Returns a summary for the frontend.
 */
export async function connectYoutubeAccount(code: string): Promise<YoutubeConnectResult> {
  assertYoutubeConfig();
  if (!code) throw httpError('Missing authorization code', HttpStatus.BAD_REQUEST);

  const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);
  const channel = await fetchChannel(accessToken);

  const summary: YoutubeSummary = {
    channelId: channel.channelId,
    title: channel.title,
    customUrl: channel.customUrl,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: channel.viewCount,
  };

  const demographics = await fetchYoutubeDemographics(accessToken);
  if (demographics) {
    summary.topCountries = demographics.topCountries;
    summary.age = demographics.age;
    summary.gender = demographics.gender;
  } else {
    summary.note = 'Audience demographics need more channel activity (views over the last year).';
  }

  logger.info(`YT connected: ${summary.title} (${summary.channelId}), subs=${summary.subscriberCount}`);

  const accountId = await upsertYoutubeAccount(summary, refreshToken, accessToken, expiresAt);
  return { summary, accountId };
}

/**
 * Upsert the connected channel keyed by channelId. Re-connecting refreshes the tokens,
 * stats, and demographics on the same row (idempotent — no duplicates). Keeps the existing
 * refresh token if Google didn't return a new one.
 */
async function upsertYoutubeAccount(
  summary: YoutubeSummary,
  refreshToken: string,
  accessToken: string,
  tokenExpiresAt: Date
): Promise<string> {
  const repo = AppDataSource.getRepository(YoutubeAccount);
  const existing = await repo.findOne({ where: { channelId: summary.channelId } });

  const encryptedRefreshToken = refreshToken
    ? encryptToken(refreshToken)
    : existing?.encryptedRefreshToken || '';

  const fields = {
    channelId: summary.channelId,
    title: summary.title,
    customUrl: summary.customUrl,
    subscriberCount: summary.subscriberCount,
    videoCount: summary.videoCount,
    viewCount: String(summary.viewCount),
    encryptedRefreshToken,
    encryptedAccessToken: encryptToken(accessToken),
    tokenExpiresAt,
    demographics: {
      topCountries: summary.topCountries ?? [],
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
 * Resolve a connected YouTube account's row id from its channelId. Used at
 * onboarding-submit time to stamp the FK onto newly created influencer rows.
 * Returns null if there is no (non-deleted) connected account.
 */
export async function findYoutubeAccountIdByChannelId(channelId: string | null | undefined): Promise<string | null> {
  const id = channelId?.trim();
  if (!id) return null;
  const repo = AppDataSource.getRepository(YoutubeAccount);
  const account = await repo.findOne({ where: { channelId: id } });
  if (!account || account.isDeleted) return null;
  return account.id;
}

/**
 * Disconnect a channel: soft-delete the row and clear stored tokens so revoked tokens are
 * not retained. Used by the in-app Disconnect button. Idempotent. Returns true if found.
 */
export async function disconnectYoutubeAccountByChannelId(channelId: string | null | undefined): Promise<boolean> {
  const id = channelId?.trim();
  if (!id) return false;
  const repo = AppDataSource.getRepository(YoutubeAccount);
  const account = await repo.findOne({ where: { channelId: id } });
  if (!account) return false;
  repo.merge(account, { isDeleted: true, encryptedRefreshToken: '', encryptedAccessToken: null, tokenExpiresAt: null });
  await repo.save(account);
  logger.info(`YT account disconnected: channelId=${id}`);
  return true;
}

// ---------------------------------------------------------------------------
// Stats refresh (daily cron). Google refresh tokens are long-lived, so rather than
// chasing an expiry window we simply re-mint an access token from the stored refresh
// token and refresh each connected channel's stats + demographics snapshot. Note:
// while the OAuth app is in "Testing" mode, refresh tokens expire after 7 days, so
// failures here are expected for test users until the app is verified/published.
// ---------------------------------------------------------------------------

/** Refresh one account: mint a fresh access token, re-read channel + demographics, persist. */
async function refreshYoutubeAccount(account: YoutubeAccount): Promise<void> {
  if (!account.encryptedRefreshToken) {
    logger.warn(`YT refresh skipped (no refresh token): channelId=${account.channelId}`);
    return;
  }
  const refreshToken = decryptToken(account.encryptedRefreshToken);
  const { accessToken, expiresAt } = await refreshAccessToken(refreshToken);

  const channel = await fetchChannel(accessToken);
  const demographics = await fetchYoutubeDemographics(accessToken);

  const repo = AppDataSource.getRepository(YoutubeAccount);
  repo.merge(account, {
    title: channel.title,
    customUrl: channel.customUrl,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: String(channel.viewCount),
    encryptedAccessToken: encryptToken(accessToken),
    tokenExpiresAt: expiresAt,
    demographics: demographics
      ? { topCountries: demographics.topCountries, age: demographics.age, gender: demographics.gender }
      : account.demographics,
  });
  await repo.save(account);
}

/**
 * Refresh every connected (non-deleted) channel's stats. One account's failure does not
 * abort the batch. Returns counts for logging. Invoked by the daily cron.
 */
export async function refreshAllYoutubeAccounts(): Promise<{ total: number; refreshed: number; failed: number }> {
  const repo = AppDataSource.getRepository(YoutubeAccount);
  const accounts = await repo.find({ where: { isDeleted: false } });

  let refreshed = 0;
  let failed = 0;
  for (const account of accounts) {
    try {
      await refreshYoutubeAccount(account);
      refreshed += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`YT stats refresh failed for channelId=${account.channelId}: ${message}`);
    }
  }

  logger.info(`YT stats refresh: ${accounts.length} accounts, ${refreshed} refreshed, ${failed} failed`);
  return { total: accounts.length, refreshed, failed };
}
