import 'dotenv/config';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3456',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  PORT: parseInt(process.env.PORT || '3456', 10),
  CLONE_DIR: process.env.CLONE_DIR || '/tmp/dardocs-repos',
};
