export type NotificationLevel = 'info' | 'success' | 'error'

export interface NotificationAction {
  label: string
  url: string
}

export interface Notification {
  title: string
  body: string
  level: NotificationLevel
  /** Opened when the notification body itself is tapped (ntfy `click`). */
  clickUrl?: string
  /** Poster/screenshot shown as an attachment (ntfy `attach`) — not populated yet, no notifier reaches for artwork today. */
  imageUrl?: string
  /** Rendered as tappable buttons (ntfy `actions`) — keep to a couple, ntfy caps how many it displays usefully. */
  actions?: NotificationAction[]
}
