import vine from '@vinejs/vine'

export const removeLibraryItemValidator = vine.compile(
  vine.object({
    scheme: vine.enum(['tmdb', 'tvdb', 'musicbrainz'] as const),
    value: vine.string(),
    deleteFiles: vine.enum(['true', 'false'] as const),
  }),
)
