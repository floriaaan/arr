export type NotificationLevel = 'info' | 'success' | 'error'

export interface Notification {
  title: string
  body: string
  level: NotificationLevel
}
