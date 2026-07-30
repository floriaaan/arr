import vine from '@vinejs/vine'

/** `kind` travels in the route param on every media server endpoint. */
export const saveMediaServerValidator = vine.compile(
  vine.object({
    baseUrl: vine.string(),
    enabled: vine.boolean(),
  }),
)
