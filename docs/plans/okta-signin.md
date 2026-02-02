# Plan: Sign in with Okta

## Current State

DarDocs uses **BetterAuth** (`better-auth@^1.4.18`) for authentication, currently configured with email/password only. The backend runs on Fastify with a PostgreSQL database managed by Drizzle ORM.

Key existing files:

| File | Role |
|------|------|
| `apps/api/src/lib/auth.ts` | BetterAuth instance configuration |
| `apps/api/src/lib/env.ts` | Server environment variables |
| `apps/api/src/lib/schema.ts` | Drizzle schema (includes `accounts` table for OAuth) |
| `apps/api/src/routes/auth.ts` | Fastify route handler forwarding to BetterAuth |
| `packages/editor/src/stores/authStore.ts` | Zustand auth store (client) |
| `packages/editor/src/lib/api.ts` | API client (`authApi` methods) |
| `apps/web/src/pages/AuthPage.tsx` | Login/signup UI |

The database `accounts` table already has columns for OAuth providers: `provider_id`, `access_token`, `refresh_token`, `id_token`, `scope`, etc. No schema migration is needed.

---

## Approach

BetterAuth supports generic OAuth2/OIDC social providers through its `socialProviders` configuration. Okta exposes standard OIDC endpoints, so we configure it as a **generic OIDC provider** in BetterAuth.

The flow:
1. User clicks "Sign in with Okta" on the auth page
2. Browser redirects to Okta's `/authorize` endpoint
3. User authenticates in Okta
4. Okta redirects back to `/api/auth/callback/okta` with an authorization code
5. BetterAuth exchanges the code for tokens, creates/links the user, and sets a session cookie
6. Browser redirects to the app; `checkSession()` picks up the authenticated user

---

## Steps

### 1. Okta Application Setup (manual, outside codebase)

Register an application in the Okta Admin Console:
- **Application type**: Web Application
- **Sign-in redirect URI**: `{BETTER_AUTH_URL}/api/auth/callback/okta`
- **Sign-out redirect URI**: `{CORS_ORIGIN}`
- **Grant types**: Authorization Code
- **Scopes**: `openid`, `profile`, `email`

Record the **Client ID**, **Client Secret**, and **Okta domain** (e.g., `https://dev-123456.okta.com`).

### 2. Add Environment Variables

**File: `apps/api/src/lib/env.ts`**

Add three new variables:

```ts
OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID!,
OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET!,
OKTA_ISSUER: process.env.OKTA_ISSUER!,  // e.g. https://dev-123456.okta.com/oauth2/default
```

**File: `apps/api/.env.example`**

Add:

```
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default
```

### 3. Configure BetterAuth with Okta Provider

**File: `apps/api/src/lib/auth.ts`**

BetterAuth supports generic OIDC via `genericOAuth` in the `socialProviders` config. Add Okta as a generic OIDC provider:

```ts
import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';
import { env } from './env.js';
import * as schema from './schema.js';

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
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'okta',
          discoveryUrl: `${env.OKTA_ISSUER}/.well-known/openid-configuration`,
          clientId: env.OKTA_CLIENT_ID,
          clientSecret: env.OKTA_CLIENT_SECRET,
          scopes: ['openid', 'profile', 'email'],
        },
      ],
    }),
  ],
});
```

The `discoveryUrl` means BetterAuth auto-discovers Okta's authorization, token, userinfo, and JWKS endpoints. No manual endpoint configuration needed.

**Note:** Verify the exact BetterAuth `genericOAuth` plugin API against the version in use. The BetterAuth docs may refer to this as `genericOAuth` or `genericOIDC`. If `genericOAuth` is not available, the alternative is to use `socialProviders` with a custom provider config — check BetterAuth docs for the installed version.

### 4. No Auth Route Changes Needed

The existing wildcard handler in `apps/api/src/routes/auth.ts` already forwards all `/api/auth/*` requests to BetterAuth:

```ts
app.all('/api/auth/*', async (request, reply) => { ... });
```

BetterAuth will automatically register:
- `GET /api/auth/sign-in/social` (with `provider=okta` query param) — initiates the redirect
- `GET /api/auth/callback/okta` — handles the callback

No changes to `auth.ts` routes required.

### 5. Update the API Client

**File: `packages/editor/src/lib/api.ts`**

Add a method to initiate the Okta OAuth flow:

```ts
export const authApi = {
  // ... existing methods ...

  signInWithOkta: () => {
    // Redirect the browser to the BetterAuth Okta sign-in endpoint.
    // BetterAuth will redirect to Okta, then back to /api/auth/callback/okta,
    // and finally redirect the user to the app with a session cookie set.
    window.location.href = '/api/auth/sign-in/social?provider=okta';
  },
};
```

This is a full-page redirect, not an API call — standard for OAuth flows.

### 6. Update the Auth Store

**File: `packages/editor/src/stores/authStore.ts`**

Add `signInWithOkta` to the store interface and implementation:

```ts
interface AuthStore {
  // ... existing fields ...
  signInWithOkta: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // ... existing methods ...

  signInWithOkta: () => {
    set({ loading: true, error: null });
    authApi.signInWithOkta();
    // Browser navigates away; no need to handle response
  },
}));
```

### 7. Update the Auth Page UI

**File: `apps/web/src/pages/AuthPage.tsx`**

Add an "Sign in with Okta" button. Place it below the existing form with a visual separator:

```tsx
export function AuthPage() {
  const { signIn, signUp, signInWithOkta, error, loading, clearError } = useAuthStore();

  // ... existing form code ...

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">DarDocs</h1>
        <p className="auth-subtitle">
          {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* ... existing email/password fields ... */}
        </form>

        {mode === 'signin' && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-okta-btn"
              onClick={signInWithOkta}
              disabled={loading}
            >
              Sign in with Okta
            </button>
          </>
        )}

        <p className="auth-toggle">
          {/* ... existing toggle ... */}
        </p>
      </div>
    </div>
  );
}
```

### 8. Add Styles for the Okta Button

**File: `apps/web/src/index.css`**

Add styles for the divider and Okta button, matching the existing auth page aesthetic:

```css
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  color: #8b95a5;
  font-size: 13px;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e6ed;
}

.auth-okta-btn {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e2e6ed;
  border-radius: 8px;
  background: #fff;
  color: #1a2233;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.auth-okta-btn:hover {
  background: #f5f7fa;
  border-color: #c9cfd9;
}

.auth-okta-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### 9. Handle OAuth Callback Redirect

After Okta authentication, BetterAuth redirects the browser to `{CORS_ORIGIN}` (or a configured `callbackURL`). The app loads, `checkSession()` fires on mount in `App.tsx`, detects the session cookie, and the user is logged in.

If a custom post-login redirect is needed, configure `callbackURL` in the generic OAuth config:

```ts
genericOAuth({
  config: [{
    providerId: 'okta',
    // ... other config ...
    callbackURL: env.CORS_ORIGIN,  // redirect here after OAuth completes
  }],
}),
```

No additional route or client-side callback handling is required because the existing `App.tsx` flow (`checkSession` on mount -> render authenticated layout if user exists) already handles this.

### 10. Handle Account Linking

When a user signs up via email/password and later signs in with Okta (or vice versa), BetterAuth matches accounts by email. If the emails match, BetterAuth links the Okta identity to the existing user — no duplicate accounts are created. The `accounts` table stores both the `credential` (password) entry and the `okta` provider entry for the same `user_id`.

If stricter behavior is needed (e.g., require explicit linking), BetterAuth's `accountLinking` config can be customized in `auth.ts`:

```ts
accountLinking: {
  enabled: true,       // default: true
  trustedProviders: ['okta'],
},
```

---

## Files Changed (Summary)

| File | Change |
|------|--------|
| `apps/api/src/lib/env.ts` | Add `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER` |
| `apps/api/.env.example` | Document the new env vars |
| `apps/api/src/lib/auth.ts` | Add `genericOAuth` plugin with Okta config |
| `apps/api/package.json` | No change needed (generic OAuth is built into `better-auth`) |
| `packages/editor/src/lib/api.ts` | Add `signInWithOkta()` method to `authApi` |
| `packages/editor/src/stores/authStore.ts` | Add `signInWithOkta` to the store |
| `apps/web/src/pages/AuthPage.tsx` | Add Okta sign-in button with divider |
| `apps/web/src/index.css` | Add `.auth-divider` and `.auth-okta-btn` styles |

No database migrations are required — the existing `accounts` table schema already supports OAuth providers.

---

## Risks and Considerations

1. **BetterAuth `genericOAuth` API stability** — Verify the exact plugin import path and config shape against the installed `better-auth@^1.4.18` docs. The API may differ between versions.

2. **Okta issuer URL format** — Must include the authorization server path (typically `/oauth2/default`). An incorrect issuer will cause discovery to fail.

3. **CORS and cookies** — The OAuth callback redirect must land on the `CORS_ORIGIN`. Cross-origin cookie issues can occur if the API and frontend are on different domains without proper `SameSite`/`Secure` cookie settings. In production, both should be on the same domain or use `SameSite=None; Secure`.

4. **User provisioning** — First-time Okta users get auto-provisioned with name/email from the Okta ID token claims. If Okta returns different claim names (e.g., `preferred_username` instead of `name`), a `mapProfileToUser` function may be needed in the provider config.

5. **Okta-only enforcement** — If the goal is to require Okta for all users (disable email/password), set `emailAndPassword: { enabled: false }` in BetterAuth config. The current plan keeps both methods enabled.

6. **Sign-up via Okta** — The plan only shows the Okta button on the sign-in form. Users who click it for the first time are auto-registered. If the sign-up form should also show it, the `{mode === 'signin' && ...}` guard can be removed.
