import { Result } from '#domain/shared/result'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { Notification, NotificationLevel } from '#domain/notifications/notification.vo'
import type { NotificationError } from '#domain/notifications/notification-error.vo'

const TIMEOUT_MS = 5_000

/** ntfy tag shortcodes (https://docs.ntfy.sh/emojis/) rendered as an emoji prefix by ntfy clients. */
const LEVEL_TAGS: Record<NotificationLevel, string[]> = {
  success: ['tada'],
  error: ['rotating_light'],
  info: ['bell'],
}

const LEVEL_PRIORITY: Record<NotificationLevel, number> = {
  success: 3,
  error: 5,
  info: 3,
}

/**
 * Targets ntfy's JSON publish endpoint (https://docs.ntfy.sh/publish/#publish-as-json),
 * which is the only way to get tags/priority/actions/attachments — and,
 * critically, lives at the server root with `topic` as a JSON field, *not*
 * at the topic URL itself. POSTing JSON straight to the topic URL (what this
 * used to do) just publishes the raw JSON text as the message, since ntfy
 * only parses structured fields at the root endpoint.
 */
export class WebhookNotifier implements Notifier {
  constructor(private readonly repository: NotificationSettingsRepository) {}

  async notify(notification: Notification): Promise<Result<void, NotificationError>> {
    const settings = await this.repository.get()
    if (!settings.webhookUrl) {
      return Result.err({ type: 'not_configured', message: 'No webhook URL configured.' })
    }

    const target = resolveNtfyTarget(settings.webhookUrl.value)
    if (!target) {
      return Result.err({
        type: 'delivery_failed',
        message: `"${settings.webhookUrl.value}" does not look like an ntfy topic URL (https://host/topic).`,
      })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authorization = settings.auth.authorizationHeader()
    if (authorization) headers.Authorization = authorization

    const payload: Record<string, unknown> = {
      topic: target.topic,
      title: notification.title,
      message: notification.body,
      tags: LEVEL_TAGS[notification.level],
      priority: LEVEL_PRIORITY[notification.level],
      markdown: true,
    }
    if (notification.clickUrl) payload.click = notification.clickUrl
    if (notification.imageUrl) payload.attach = notification.imageUrl
    if (notification.actions?.length) {
      payload.actions = notification.actions.map((action) => ({
        action: 'view',
        label: action.label,
        url: action.url,
      }))
    }

    try {
      const response = await fetch(target.origin, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!response.ok) {
        return Result.err({
          type: 'delivery_failed',
          message: `ntfy answered HTTP ${response.status}`,
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

function resolveNtfyTarget(webhookUrl: string): { origin: string; topic: string } | null {
  let parsed: URL
  try {
    parsed = new URL(webhookUrl)
  } catch {
    return null
  }
  const topic = parsed.pathname.replace(/^\/+|\/+$/g, '')
  if (!topic) return null
  return { origin: parsed.origin, topic }
}
