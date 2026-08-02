import vine from '@vinejs/vine'

export const linkMediaServerAccountValidator = vine.compile(
  vine.object({
    baseUrl: vine.string().trim().url(),
    username: vine.string().trim().minLength(1),
    password: vine.string().minLength(1),
  }),
)
