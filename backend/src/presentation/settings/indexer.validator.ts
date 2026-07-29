import vine from '@vinejs/vine'

/**
 * Loose on purpose: `fields` is a largely opaque *arr `fields[]` array whose
 * shape varies per `implementation` — only `name` is checked, the rest
 * passes through untouched (cf. `IndexerRecord`).
 */
const fieldSchema = vine.object({ name: vine.string() }).allowUnknownProperties()

export const indexerPayloadValidator = vine.compile(
  vine
    .object({
      name: vine.string().minLength(1),
      implementation: vine.string(),
      configContract: vine.string(),
      protocol: vine.enum(['torrent', 'usenet'] as const),
      enableRss: vine.boolean(),
      enableAutomaticSearch: vine.boolean(),
      enableInteractiveSearch: vine.boolean(),
      priority: vine.number(),
      fields: vine.array(fieldSchema),
    })
    .allowUnknownProperties(),
)
