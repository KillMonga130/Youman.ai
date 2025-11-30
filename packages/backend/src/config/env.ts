import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),

  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ai_humanizer'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ai_humanizer'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().default('development-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // API Keys (optional in development)
  GPTZERO_API_KEY: z.string().optional(),
  ORIGINALITY_API_KEY: z.string().optional(),
  TURNITIN_API_KEY: z.string().optional(),
  COPYSCAPE_API_KEY: z.string().optional(),
  GRAMMARLY_API_KEY: z.string().optional(),
  
  // LLM API Keys for ML inference
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // Storage (AWS S3 or Cloudflare R2)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(), // Optional - uses IAM role if not provided
  S3_SECRET_KEY: z.string().optional(), // Optional - uses IAM role if not provided
  S3_ENDPOINT: z.string().optional(), // For Cloudflare R2 or other S3-compatible services
  
  // AWS Bedrock (uses AWS credentials from environment/IAM role)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BEDROCK_ENABLED: z.string().transform(val => val === 'true').default('true'),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  // OAuth for Authentication (Google, GitHub)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Cloud Storage (Google Drive, Dropbox, OneDrive)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DROPBOX_CLIENT_ID: z.string().optional(),
  DROPBOX_CLIENT_SECRET: z.string().optional(),
  ONEDRIVE_CLIENT_ID: z.string().optional(),
  ONEDRIVE_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  database: {
    url: env.DATABASE_URL,
    mongoUri: env.MONGODB_URI,
    redisUrl: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  corsOrigins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0),

  externalApis: {
    gptZero: env.GPTZERO_API_KEY,
    originality: env.ORIGINALITY_API_KEY,
    turnitin: env.TURNITIN_API_KEY,
    copyscape: env.COPYSCAPE_API_KEY,
    grammarly: env.GRAMMARLY_API_KEY,
    googleFactCheck: process.env.GOOGLE_FACT_CHECK_API_KEY,
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    google: env.GOOGLE_API_KEY,
  },

  jwtSecret: env.JWT_SECRET,

  storage: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    endpoint: env.S3_ENDPOINT, // For Cloudflare R2
  },

  aws: {
    region: env.AWS_REGION,
    bedrockEnabled: env.AWS_BEDROCK_ENABLED,
  },

  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY,
    publicKey: env.PAYSTACK_PUBLIC_KEY,
    webhookSecret: env.PAYSTACK_WEBHOOK_SECRET,
  },

  oauth: {
    google: {
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
    },
  },

  cloudStorage: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    dropbox: {
      clientId: env.DROPBOX_CLIENT_ID,
      clientSecret: env.DROPBOX_CLIENT_SECRET,
    },
    onedrive: {
      clientId: env.ONEDRIVE_CLIENT_ID,
      clientSecret: env.ONEDRIVE_CLIENT_SECRET,
    },
  },
};
