import type { NotificationSettings } from '../notification-settings.aggregate.js'

export interface NotificationSettingsRepository {
  /** Always returns settings — an unconfigured instance gets the defaults. */
  get(): Promise<NotificationSettings>
  save(settings: NotificationSettings): Promise<void>
}
