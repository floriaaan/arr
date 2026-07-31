import { Result } from '#domain/shared/result'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { Notification } from '#domain/notifications/notification.vo'
import type { NotificationError } from '#domain/notifications/notification-error.vo'

const TIMEOUT_MS = 5_000

/**
 * One generic webhook rather than one integration per service. The payload
 * carries the same text under three keys on purpose — `content` is what
 * Discord reads, `title`/`message` is what ntfy and Gotify read — so a single
 * adapter covers the three common self-hosted targets with no per-service
 * code (cf. docs/phase-6-fiabilite-requests/02, chantier 2 décision 1).
 */
export class WebhookNotifier implements Notifier {
  constructor(private readonly repository: NotificationSettingsRepository) {}

  async notify(notification: Notification): Promise<Result<void, NotificationError>> {
    const settings = await this.repository.get()
    if (!settings.webhookUrl) {
      return Result.err({ type: 'not_configured', message: 'No webhook URL configured.' })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authorization = settings.auth.authorizationHeader()
    if (authorization) headers.Authorization = authorization

    try {
      const response = await fetch(settings.webhookUrl.value, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: `**${notification.title}**\n${notification.body}`,
          title: notification.title,
          message: notification.body,
          level: notification.level,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!response.ok) {
        return Result.err({
          type: 'delivery_failed',
          message: `Webhook answered HTTP ${response.status}`,
        })
      }
      return Result.ok(undefined)
    } catch (error) {
      return Result.err({
        type: 'delivery_failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
