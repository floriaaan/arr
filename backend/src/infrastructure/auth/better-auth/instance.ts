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
    emailAndPassword: { enabled: true },
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
