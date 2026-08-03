import vine from '@vinejs/vine'

export const completePlexLinkValidator = vine.compile(
  vine.object({
    pin: vine.object({
      id: vine.number(),
      code: vine.string(),
      clientIdentifier: vine.string(),
    }),
  }),
)
