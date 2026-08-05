import { betterAuth } from 'better-auth'
import { admin, genericOAuth } from 'better-auth/plugins'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import env from '#start/env'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'

const pool = new Pool({
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  user: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
  database: env.get('DB_DATABASE'),
})

const db = new Kysely({ dialect: new PostgresDialect({ pool }) })

export type BetterAuthInstance = ReturnType<typeof buildAuthInstance>

function buildAuthInstance(
  oidc: Awaited<ReturnType<AuthSettingsProvider['resolveEffective']>>['oidc'],
) {
  return betterAuth({
    database: { db, type: 'postgres' },
    secret: env.get('BETTER_AUTH_SECRET').release(),
    /**
     * Without these, better-auth derives its notion of "trusted" purely
     * from the incoming request, which is fine for plain cookie-based
     * session calls but rejects the OIDC flow with INVALID_ORIGIN: the
     * redirect_uri sent to the provider needs a stable `baseURL`, and the
     * browser's `Origin` header on the initiating request needs to be in
     * `trustedOrigins` (cf. docs/phase-0/04-endpoints-http.md, same-origin
     * proxy setup — the frontend's origin, not this server's own).
     */
    baseURL: env.get('APP_URL'),
    trustedOrigins: env
      .get('CORS_ORIGIN', '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    emailAndPassword: { enabled: true },
    /**
     * The migration (`create_identity_tables_table.ts`) uses snake_case
     * columns, matching every other table in this codebase — better-auth's
     * Kysely adapter otherwise queries columns by its own camelCase field
     * names verbatim (no automatic case translation), so every multi-word
     * field (core + admin plugin's `banReason`/`banExpires`/
     * `impersonatedBy`) needs an explicit mapping here.
     */
    user: {
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        banReason: 'ban_reason',
        banExpires: 'ban_expires',
      } as Record<string, string>,
    },
    session: {
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        impersonatedBy: 'impersonated_by',
      } as Record<string, string>,
    },
    account: {
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      /**
       * better-auth already resolves an incoming OIDC identity to an existing
       * user by email (`findOAuthUser`) — the merge itself is automatic. What
       * it gates by default is whether to link *implicitly* without an extra
       * verification step, and both of its default guards defeat us here:
       *   - `pocketid` isn't in `trustedProviders`, so the provider itself
       *     isn't trusted;
       *   - `requireLocalEmailVerified` defaults to `true`, but this app has
       *     no email-verification flow at all, so a password account (e.g.
       *     the admin created at onboarding) is permanently unverified.
       * Together those unconditionally block linking regardless of what
       * PocketID reports, so the onboarding admin could never sign back in
       * over SSO with the same email. The instance admin already establishes
       * trust by configuring OIDC in settings — that's the linking boundary,
       * not local email verification we don't otherwise implement.
       */
      accountLinking: {
        enabled: true,
        trustedProviders: ['pocketid'],
        requireLocalEmailVerified: false,
      },
    },
    verification: {
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    /**
     * Runs after the `admin` plugin's own `user.create.before` hook (plugin
     * hooks run first, top-level `databaseHooks` last — cf. better-auth's
     * `runPluginInit`), so this override wins: the very first account ever
     * created is promoted to admin, every later one keeps the plugin's
     * 'user' default. Per ADR-0005, this is the only role assignment for
     * account creation — no raw SQL write to better-auth's `user` table.
     */
    databaseHooks: {
      user: {
        create: {
          async before(user, ctx) {
            if (!ctx) return
            const existingUserCount = await ctx.context.internalAdapter.countTotalUsers()
            if (existingUserCount === 0) return { data: { ...user, role: 'admin' } }
          },
        },
      },
    },
    plugins: [
      admin(),
      ...(oidc
        ? [
            genericOAuth({
              config: [
                {
                  providerId: 'pocketid',
                  clientId: oidc.clientId,
                  clientSecret: oidc.clientSecret.reveal(),
                  discoveryUrl: `${oidc.issuerUrl.value}/.well-known/openid-configuration`,
                  // Without this, better-auth defaults to `scopes: []` — an
                  // empty `scope=` param that PocketID rejects outright with
                  // access_denied rather than a scope-specific error.
                  scopes: ['openid', 'profile', 'email'],
                },
              ],
            }),
          ]
        : []),
    ],
  })
}

/**
 * better-auth's plugin config (genericOAuth in particular) is static —
 * decided at construction, not per-request — but the spec wants OIDC
 * hot-reloadable from settings without a process restart. This lazily
 * rebuilds the instance whenever the effective OIDC config actually changes,
 * checked once per call against a cheap DB read (AuthSettingsProvider),
 * rather than requiring every settings write to reach into this module.
 */
let cached: { instance: ReturnType<typeof buildAuthInstance>; oidcSignature: string } | null = null

function signatureFor(
  oidc: Awaited<ReturnType<AuthSettingsProvider['resolveEffective']>>['oidc'],
): string {
  return oidc ? `${oidc.issuerUrl.value}:${oidc.clientId}` : 'none'
}

export async function getAuthInstance(
  authSettingsProvider: AuthSettingsProvider,
): Promise<BetterAuthInstance> {
  const effective = await authSettingsProvider.resolveEffective()
  const signature = signatureFor(effective.oidc)

  if (!cached || cached.oidcSignature !== signature) {
    cached = { instance: buildAuthInstance(effective.oidc), oidcSignature: signature }
  }

  return cached.instance
}
