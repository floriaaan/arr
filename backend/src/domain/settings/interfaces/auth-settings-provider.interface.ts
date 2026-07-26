import type { EffectiveAuthSettings } from '../effective-auth-settings.vo.js'

export interface AuthSettingsProvider {
  resolveEffective(): Promise<EffectiveAuthSettings>
}
