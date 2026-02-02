import { betterAuth } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins';
import { okta } from 'better-auth/plugins/generic-oauth';
import { db } from './db.js';
import { env } from './env.js';
import * as schema from './schema.js';

const plugins: BetterAuthPlugin[] = [];

if (env.OKTA_CLIENT_ID && env.OKTA_CLIENT_SECRET && env.OKTA_ISSUER) {
  plugins.push(
    genericOAuth({
      config: [
        okta({
          clientId: env.OKTA_CLIENT_ID,
          clientSecret: env.OKTA_CLIENT_SECRET,
          issuer: env.OKTA_ISSUER,
        }),
      ],
    }),
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins,
});
