import type { Result } from '#domain/shared/result'
import type { Notification } from '../notification.vo.js'
import type { NotificationError } from '../notification-error.vo.js'

export interface Notifier {
  notify(notification: Notification): Promise<Result<void, NotificationError>>
}
