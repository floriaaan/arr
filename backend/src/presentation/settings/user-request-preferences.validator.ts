import vine from '@vinejs/vine'

export const setUserAutoApproveValidator = vine.compile(
  vine.object({
    autoApprove: vine.boolean().nullable(),
  }),
)
