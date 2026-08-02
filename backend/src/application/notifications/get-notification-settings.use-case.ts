import type { UseCase } from '#application/shared/use-case'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'

export class GetNotificationSettings implements UseCase<void, NotificationSettings> {
  constructor(private readonly repository: NotificationSettingsRepository) {}

  async execute(): Promise<NotificationSettings> {
    return this.repository.get()
  }
}
