import { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import type { UseCase } from '#application/shared/use-case'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import type { ValidationError } from '#domain/shared/validation-error'

export interface SaveNotificationSettingsInput {
  /** `null` clears it; `undefined` keeps the stored one (it never travels back to the client). */
  webhookUrl?: string | null
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export class SaveNotificationSettings implements UseCase<
  SaveNotificationSettingsInput,
  Result<NotificationSettings, ValidationError>
> {
  constructor(private readonly repository: NotificationSettingsRepository) {}

  async execute(
    input: SaveNotificationSettingsInput,
  ): Promise<Result<NotificationSettings, ValidationError>> {
    const settings = await this.repository.get()

    let webhookUrl = settings.webhookUrl
    if (input.webhookUrl === null) {
      webhookUrl = null
    } else if (input.webhookUrl !== undefined) {
      const parsed = Url.create(input.webhookUrl)
      if (!parsed.ok) return parsed
      webhookUrl = parsed.value
    }

    settings.configure({
      webhookUrl,
      onRequestAvailable: input.onRequestAvailable,
      onRequestFailed: input.onRequestFailed,
      onInstanceUnreachable: input.onInstanceUnreachable,
    })
    await this.repository.save(settings)
    return Result.ok(settings)
  }
}
