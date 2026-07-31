import type { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'

export interface NotificationSettingsDto {
  hasWebhookUrl: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

/**
 * The URL never travels back, only `hasWebhookUrl` — same treatment as
 * `ServarrInstanceDto.hasApiKey`, because a Discord webhook URL is a write
 * token (cf. docs/phase-6-fiabilite-requests/02, chantier 2 décision 4).
 */
export function toNotificationSettingsDto(settings: NotificationSettings): NotificationSettingsDto {
  return {
    hasWebhookUrl: settings.webhookUrl !== null,
    onRequestAvailable: settings.onRequestAvailable,
    onRequestFailed: settings.onRequestFailed,
    onInstanceUnreachable: settings.onInstanceUnreachable,
  }
}
