import app from '@adonisjs/core/services/app'
import { appUrl } from '#config/app'
import { GetNotificationSettings } from '#application/notifications/get-notification-settings.use-case'
import { SaveNotificationSettings } from '#application/notifications/save-notification-settings.use-case'
import { SendNotification } from '#application/notifications/send-notification.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toNotificationSettingsDto } from './notification-settings.dto.js'
import { saveNotificationSettingsValidator } from './notification-settings.validator.js'
import type { HttpContext } from '@adonisjs/core/http'

export default class NotificationsController {
  async show(ctx: HttpContext) {
    const repository = await app.container.make('notifications.settingsRepository')
    const settings = await new GetNotificationSettings(repository).execute()
    return ctx.response.json({ notifications: toNotificationSettingsDto(settings) })
  }

  async update(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(saveNotificationSettingsValidator)
    const repository = await app.container.make('notifications.settingsRepository')

    const result = await new SaveNotificationSettings(repository).execute(payload)
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ notifications: toNotificationSettingsDto(result.value) })
  }

  /**
   * 200 with `{ ok: false }` rather than a 5xx when delivery fails — same
   * convention as `POST /api/onboarding/instances/test`: a failed test is an
   * answer, not a broken request.
   */
  async test(ctx: HttpContext) {
    const notifier = await app.container.make('notifications.notifier')

    const result = await new SendNotification(notifier).execute({
      title: '🔔 Test notification',
      body: 'If you can read this, **arr** can reach your ntfy topic.',
      level: 'info',
      clickUrl: `${appUrl}/settings`,
    })

    if (!result.ok) {
      return ctx.response.json({ ok: false, error: result.error })
    }
    return ctx.response.json({ ok: true })
  }
}
