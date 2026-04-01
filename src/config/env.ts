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