import vine from '@vinejs/vine'

const mediaKindSchema = vine.enum(['movie', 'series', 'album'] as const)

export const searchMediaValidator = vine.compile(
  vine.object({
    kind: mediaKindSchema,
    term: vine.string().minLength(1),
  }),
)

export const mediaDetailValidator = vine.compile(
  vine.object({
    scheme: vine.enum(['tmdb', 'tvdb', 'musicbrainz'] as const),
    value: vine.string(),
    kind: mediaKindSchema,
  }),
)
