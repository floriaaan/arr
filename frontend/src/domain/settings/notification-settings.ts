export type NotificationAuthMode = 'none' | 'token' | 'basic'

export interface NotificationSettingsDto {
  /** The URL itself never leaves the backend — it is a write token. */
  hasWebhookUrl: boolean
  authMode: NotificationAuthMode
  /** The token itself never leaves the backend — same treatment as the webhook URL. */
  hasToken: boolean
  /** Not secret — echoed back, unlike the token/password. */
  username: string | null
  /** The password itself never leaves the backend. */
  hasPassword: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export interface NotificationSettingsDraft {
  /** Omit to keep the stored URL, `null` to clear it. */
  webhookUrl?: string | null
  authMode: NotificationAuthMode
  /** Only read when `authMode` is `'token'`. Omit to keep the stored token. */
  token?: string
  /** Only read when `authMode` is `'basic'`. Omit to keep the stored username. */
  username?: string
  /** Only read when `authMode` is `'basic'`. Omit to keep the stored password. */
  password?: string
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export type NotificationTestResult = { ok: true } | { ok: false; error: { message: string } }
