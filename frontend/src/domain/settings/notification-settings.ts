export interface NotificationSettingsDto {
  /** The URL itself never leaves the backend — it is a write token. */
  hasWebhookUrl: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export interface NotificationSettingsDraft {
  /** Omit to keep the stored URL, `null` to clear it. */
  webhookUrl?: string | null
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export type NotificationTestResult = { ok: true } | { ok: false; error: { message: string } }
