import 'dotenv/config';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3456',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  PORT: parseInt(process.env.PORT || '3456', 10),
  CLONE_DIR: process.env.CLONE_DIR || '/tmp/dardocs-repos',
  OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID || '',
  OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET || '',
  OKTA_ISSUER: process.env.OKTA_ISSUER || '',

  // GitHub App (optional — leave blank to disable GitHub integration)
  GITHUB_APP_ID: process.env.GITHUB_APP_ID || '',
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY || '', // base64-encoded PEM
  GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID || '',
  GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET || '',
  GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET || '',
};
