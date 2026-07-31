import type { UseCase } from '#application/shared/use-case'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { Notification } from '#domain/notifications/notification.vo'
import type { NotificationError } from '#domain/notifications/notification-error.vo'
import type { Result } from '#domain/shared/result'

/** Used by the "Send a test notification" button, and by the event subscribers. */
export class SendNotification implements UseCase<Notification, Result<void, NotificationError>> {
  constructor(private readonly notifier: Notifier) {}

  async execute(notification: Notification): Promise<Result<void, NotificationError>> {
    return this.notifier.notify(notification)
  }
}
