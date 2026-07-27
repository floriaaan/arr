import vine from '@vinejs/vine'

export const testOidcValidator = vine.compile(
  vine.object({
    issuerUrl: vine.string(),
    clientId: vine.string(),
    clientSecret: vine.string(),
  }),
)

/**
 * `PUT /api/(onboarding|settings)/sso` bodies are `{...} | null` (`null` =
 * disable SSO) — a bare JSON `null` doesn't fit VineJS's object schemas, so
 * the controller checks for `null` itself before validating against this
 * schema for the non-null case.
 */
export const saveOidcValidator = vine.compile(
  vine.object({
    issuerUrl: vine.string(),
    clientId: vine.string(),
    clientSecret: vine.string(),
    claimsMapping: vine.record(vine.string()).optional(),
  }),
)
