import vine from '@vinejs/vine'

export const saveWatchlistSettingsValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
    intervalMinutes: vine.number().min(1),
    maxNewRequestsPerRun: vine.number().min(1),
  }),
)
