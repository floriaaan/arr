import vine from '@vinejs/vine'

/** `intervalMinutes` floor matches `SaveWatchlistSettings.MIN_INTERVAL_MINUTES` — a lower value would pass this validator only to be rejected by the use case, and would contradict the "min. 15" UI copy. */
export const saveWatchlistSettingsValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
    intervalMinutes: vine.number().min(15),
    maxNewRequestsPerRun: vine.number().min(1),
  }),
)
