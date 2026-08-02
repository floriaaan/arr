export type NotificationErrorType = 'not_configured' | 'delivery_failed'

export interface NotificationError {
  type: NotificationErrorType
  message: string
}
