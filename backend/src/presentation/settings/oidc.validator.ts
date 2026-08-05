import vine from '@vinejs/vine'

export const testOidcValidator = vine.compile(
  vine.object({
    issuerUrl: vine.string(),
    clientId: vine.string(),
    clientSecret: vine.string(),
  }),
)

/**
 * `PUT /api/(onboarding|settings)/sso` takes `{ config: {...} | null }`
 * (`config: null` = disable SSO). Wrapped in an object rather than a bare
 * `{...} | null` body: AdonisJS's bodyparser rejects a raw JSON `null` body
 * outright (only `{` / `[` pass its strict-JSON check), so the request never
 * reached the controller for the "skip SSO" case — a wrapper object keeps
 * the body valid JSON-object shape regardless of `config`'s value.
 */
export const saveOidcValidator = vine.compile(
  vine.object({
    config: vine
      .object({
        issuerUrl: vine.string(),
        clientId: vine.string(),
        clientSecret: vine.string(),
        claimsMapping: vine.record(vine.string()).optional(),
      })
      .nullable(),
  }),
)
