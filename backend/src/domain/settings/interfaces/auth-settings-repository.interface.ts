import type { AuthSettings } from '../auth-settings.aggregate.js'

export interface AuthSettingsRepository {
  get(): Promise<AuthSettings>
  save(settings: AuthSettings): Promise<void>
}
