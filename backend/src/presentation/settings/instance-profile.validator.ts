import vine from '@vinejs/vine'

const seriesTypeSchema = vine.enum(['standard', 'daily', 'anime'] as const).optional()
const minimumAvailabilitySchema = vine
  .enum(['announced', 'inCinemas', 'released', 'preDB'] as const)
  .optional()

/**
 * Loose on purpose: `items` is a largely opaque *arr Quality Profile items
 * array (cf. QualityProfileRecord) — only what this app edits is checked,
 * the rest passes through untouched.
 */
const qualityProfileInputSchema = vine
  .object({
    upgradeAllowed: vine.boolean(),
    cutoff: vine.number(),
    items: vine.array(vine.any()),
  })
  .allowUnknownProperties()

export const createInstanceProfileValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(64),
    rootFolderPath: vine.string(),
    qualityProfile: qualityProfileInputSchema,
    metadataProfileId: vine.number().optional(),
    languageProfileId: vine.number().optional(),
    seriesType: seriesTypeSchema,
    minimumAvailability: minimumAvailabilitySchema,
    setAsDefault: vine.boolean().optional(),
  }),
)

export const updateInstanceProfileValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(64),
    rootFolderPath: vine.string(),
    qualityProfile: qualityProfileInputSchema,
    metadataProfileId: vine.number().optional(),
    languageProfileId: vine.number().optional(),
    seriesType: seriesTypeSchema,
    minimumAvailability: minimumAvailabilitySchema,
  }),
)
