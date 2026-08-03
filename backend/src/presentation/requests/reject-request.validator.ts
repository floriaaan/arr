import vine from '@vinejs/vine'

export const rejectRequestValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(1),
  }),
)
