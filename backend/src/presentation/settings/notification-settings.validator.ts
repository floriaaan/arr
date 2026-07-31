import vine from '@vinejs/vine'

export const saveNotificationSettingsValidator = vine.compile(
  vine.object({
    /** Omitted keeps the stored URL (it is never sent back to the client); `null` clears it. */
    webhookUrl: vine.string().nullable().optional(),
    authMode: vine.enum(['none', 'token', 'basic'] as const),
    /** Omitted keeps the stored token — only read when `authMode` is `'token'`. */
    token: vine.string().optional(),
    /** Only read when `authMode` is `'basic'`. */
    username: vine.string().optional(),
    /** Omitted keeps the stored password — only read when `authMode` is `'basic'`. */
    password: vine.string().optional(),
    onRequestAvailable: vine.boolean(),
    onRequestFailed: vine.boolean(),
    onInstanceUnreachable: vine.boolean(),
  }),
)
