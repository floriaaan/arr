import vine from '@vinejs/vine'

export const saveRequestApprovalSettingsValidator = vine.compile(
  vine.object({
    moviePolicy: vine.enum(['auto', 'manual'] as const),
    seriesPolicy: vine.enum(['auto', 'manual'] as const),
    albumPolicy: vine.enum(['auto', 'manual'] as const),
  }),
)
