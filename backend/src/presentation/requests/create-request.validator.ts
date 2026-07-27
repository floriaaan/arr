import vine from '@vinejs/vine'

export const createRequestValidator = vine.compile(
  vine.object({
    kind: vine.enum(['movie', 'series', 'album'] as const),
    externalId: vine.object({
      scheme: vine.enum(['tmdb', 'tvdb', 'musicbrainz'] as const),
      value: vine.string(),
    }),
    instanceId: vine.string().optional(),
  }),
)
