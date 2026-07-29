import vine from '@vinejs/vine'

const seriesTypeSchema = vine.enum(['standard', 'daily', 'anime'] as const).optional()
const minimumAvailabilitySchema = vine
  .enum(['announced', 'inCinemas', 'released', 'preDB'] as const)
  .optional()

export const createInstanceProfileValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(64),
    rootFolderPath: vine.string(),
    qualityProfileId: vine.number(),
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
    qualityProfileId: vine.number(),
    metadataProfileId: vine.number().optional(),
    languageProfileId: vine.number().optional(),
    seriesType: seriesTypeSchema,
    minimumAvailability: minimumAvailabilitySchema,
  }),
)
