import type { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'

export interface NotificationSettingsDto {
  hasWebhookUrl: boolean
  authMode: 'none' | 'token' | 'basic'
  hasToken: boolean
  /** Not secret — echoed back, unlike the token/password. */
  username: string | null
  hasPassword: boolean
  onRequestCreated: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
  onRequestPendingApproval: boolean
}

/**
 * The URL never travels back, only `hasWebhookUrl` — same treatment as
 * `ServarrInstanceDto.hasApiKey`, because a Discord webhook URL is a write
 * token (cf. docs/phase-6-fiabilite-requests/02, chantier 2 décision 4). The
 * token/password backing ntfy auth get the same treatment.
 */
export function toNotificationSettingsDto(settings: NotificationSettings): NotificationSettingsDto {
  return {
    hasWebhookUrl: settings.webhookUrl !== null,
    authMode: settings.auth.mode,
    hasToken: settings.auth.token !== null,
    username: settings.auth.username,
    hasPassword: settings.auth.password !== null,
    onRequestCreated: settings.onRequestCreated,
    onRequestAvailable: settings.onRequestAvailable,
    onRequestFailed: settings.onRequestFailed,
    onInstanceUnreachable: settings.onInstanceUnreachable,
    onRequestPendingApproval: settings.onRequestPendingApproval,
  }
}
