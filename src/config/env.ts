import dotenvSafe from 'dotenv-safe';

dotenvSafe.config({
  example: '.env.example', // Path to example environment variables
  allowEmptyValues: false, // Do not allow empty variables
  path: '.env', // Path to your actual environment variables
});

interface Env {
  NODE_ENV: 'dev' | 'prod';
  PORT: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_SECRET: string;
  VERSION: number;
  ANTHROPIC_API_KEY?: string;
  /** Optional. Free key from https://www.alphavantage.co — used for admin FX rate API. */
  ALPHA_VANTAGE_API_KEY?: string;
  // Object Storage (AWS S3 or Hetzner Object Storage S3-compatible)
  AWS_S3_BUCKET_NAME: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  /** Optional. Set for Hetzner Object Storage (e.g. https://fsn1.your-objectstorage.com). */
  S3_ENDPOINT?: string;
  // Email
  EMAIL_USER: string;
  EMAIL_PASS: string;
  BOUNTY_EMAIL_USER: string;
  BOUNTY_EMAIL_PASS: string;
  // Client URLs
  CLIENT_WEB_URL: string;
  CLIENT_PROPOSAL_WEB_URL: string;
  // OTP (admin/auth)
  OTP_EXPIRY_MINUTES: number;
  OTP_LENGTH: number;
  // Instagram Login (from "API setup with Instagram login" — NOT the app-level Basic credentials)
  IG_APP_ID: string;
  IG_APP_SECRET: string;
  /** Must exactly match the redirect URI registered on the Instagram app and the route we expose (…/api/v1/web/instagram/callback). */
  IG_REDIRECT_URI: string;
  IG_SCOPES: string;
  // YouTube Login (Google OAuth — credentials from a Google Cloud "Web application" OAuth client)
  YT_CLIENT_ID: string;
  YT_CLIENT_SECRET: string;
  /** Must exactly match a redirect URI on the Google OAuth client and the route we expose (…/api/v1/web/youtube/callback). */
  YT_REDIRECT_URI: string;
  /** Space-separated Google scopes (youtube.readonly + yt-analytics.readonly for insights). */
  YT_SCOPES: string;
  /** 32-byte hex (64 chars) key for AES-256-GCM encryption of stored long-lived tokens. */
  TOKEN_ENC_KEY: string;
  /** Origin allowed to receive the popup postMessage after the OAuth round-trip. */
  FRONTEND_ORIGIN: string;
}

const rawNodeEnv = (process.env.NODE_ENV || 'dev').toLowerCase();
const nodeEnv: 'dev' | 'prod' =
  rawNodeEnv === 'production' || rawNodeEnv === 'prod' ? 'prod' : 'dev';

export const ENV: Env = {
  NODE_ENV: nodeEnv,
  PORT: process.env.PORT || '3000',
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: process.env.DB_PORT || '5432',
  DB_USERNAME: process.env.DB_USERNAME || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_DATABASE: process.env.DB_DATABASE || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  VERSION: parseInt(process.env.VERSION || '1', 10),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || undefined,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_ENDPOINT: process.env.S3_ENDPOINT || undefined,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  BOUNTY_EMAIL_USER: process.env.BOUNTY_EMAIL_USER || '',
  BOUNTY_EMAIL_PASS: process.env.BOUNTY_EMAIL_PASS || '',
  CLIENT_WEB_URL: process.env.CLIENT_WEB_URL || '',
  CLIENT_PROPOSAL_WEB_URL: process.env.CLIENT_PROPOSAL_WEB_URL || '',
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),
  IG_APP_ID: process.env.IG_APP_ID || '',
  IG_APP_SECRET: process.env.IG_APP_SECRET || '',
  IG_REDIRECT_URI: process.env.IG_REDIRECT_URI || '',
  IG_SCOPES: process.env.IG_SCOPES || 'instagram_business_basic,instagram_business_manage_insights',
  YT_CLIENT_ID: process.env.YT_CLIENT_ID || '',
  YT_CLIENT_SECRET: process.env.YT_CLIENT_SECRET || '',
  YT_REDIRECT_URI: process.env.YT_REDIRECT_URI || '',
  YT_SCOPES:
    process.env.YT_SCOPES ||
    'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
  TOKEN_ENC_KEY: process.env.TOKEN_ENC_KEY || '',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || '',
};

// Validate required variables
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
] as const;

requiredVars.forEach((key) => {
  if (!ENV[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// NODE_ENV is normalized above to 'dev' | 'prod' (accepts 'development'/'production' too)