import vine from '@vinejs/vine'

export const createInstanceProfileValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(1).maxLength(64),
    rootFolderPath: vine.string(),
    qualityProfileId: vine.number(),
    metadataProfileId: vine.number().optional(),
    languageProfileId: vine.number().optional(),
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
  }),
)
