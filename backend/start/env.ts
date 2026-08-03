/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Database
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  // OIDC (PocketID) — precedence over database config when set, cf. docs/adr.
  OIDC_ISSUER_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  OIDC_CLIENT_ID: Env.schema.string.optional(),
  OIDC_CLIENT_SECRET: Env.schema.string.optional(),
  DISABLE_PASSWORD_LOGIN: Env.schema.boolean.optional(),

  // Frontend origin(s) the browser actually calls the API from — used by
  // better-auth's trustedOrigins check (cf. instance.ts), comma-separated.
  CORS_ORIGIN: Env.schema.string.optional(),

  // *arr instance bootstrap — pre-creates the instance at boot if none of
  // that kind exists yet, never overwrites one saved from the UI, cf.
  // docs/adr/0010. Onboarding's admin-account step still has to happen
  // through the UI regardless.
  SONARR_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  SONARR_API_KEY: Env.schema.string.optional(),
  RADARR_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  RADARR_API_KEY: Env.schema.string.optional(),
  LIDARR_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  LIDARR_API_KEY: Env.schema.string.optional(),
})
