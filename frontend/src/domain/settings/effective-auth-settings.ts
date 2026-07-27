export interface EffectiveAuthSettings {
  passwordLoginEnabled: boolean
  oidcConfigured: boolean
  source: 'database' | 'environment'
}
