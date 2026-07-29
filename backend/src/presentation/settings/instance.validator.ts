import vine from '@vinejs/vine'

const kindSchema = vine.enum(['radarr', 'sonarr', 'lidarr'] as const)

/**
 * Used by the onboarding endpoints where `kind` travels in the body
 * (`POST /api/onboarding/instances/test`, `.../profiles`) — the settings
 * equivalents take `kind` from the route param instead, cf. `settings.controller.ts`.
 */
export const instanceConnectionValidator = vine.compile(
  vine.object({
    kind: kindSchema,
    baseUrl: vine.string(),
    apiKey: vine.string(),
  }),
)

export const testConnectionForKindValidator = vine.compile(
  vine.object({
    baseUrl: vine.string(),
    apiKey: vine.string(),
  }),
)

export const saveInstanceValidator = vine.compile(
  vine.object({
    baseUrl: vine.string(),
    apiKey: vine.string(),
    rootFolderPath: vine.string(),
    qualityProfileId: vine.number(),
    metadataProfileId: vine.number().optional(),
    languageProfileId: vine.number().optional(),
    seriesType: vine.enum(['standard', 'daily', 'anime'] as const).optional(),
    minimumAvailability: vine
      .enum(['announced', 'inCinemas', 'released', 'preDB'] as const)
      .optional(),
    enabled: vine.boolean(),
  }),
)
