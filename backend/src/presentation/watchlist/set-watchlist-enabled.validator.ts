import vine from '@vinejs/vine'

export const setWatchlistEnabledValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
  }),
)
