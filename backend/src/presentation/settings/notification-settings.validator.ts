import vine from '@vinejs/vine'

export const saveNotificationSettingsValidator = vine.compile(
  vine.object({
    /** Omitted keeps the stored URL (it is never sent back to the client); `null` clears it. */
    webhookUrl: vine.string().nullable().optional(),
    onRequestAvailable: vine.boolean(),
    onRequestFailed: vine.boolean(),
    onInstanceUnreachable: vine.boolean(),
  }),
)
