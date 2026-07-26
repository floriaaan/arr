import env from '#start/env'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { AuthSettingsRepository } from '#domain/settings/interfaces/auth-settings-repository.interface'
import { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings.vo'
import { OidcConfig } from '#domain/settings/oidc-config.vo'

/**
 * No better-auth dependency — pure config resolution (env overrides database,
 * cf. docs/phase-0 "Où configurer le SSO" and DISABLE_PASSWORD_LOGIN).
 */
export class EnvAuthSettingsProvider implements AuthSettingsProvider {
  constructor(private readonly repository: AuthSettingsRepository) {}

  async resolveEffective(): Promise<EffectiveAuthSettings> {
    const passwordLoginEnabled = !env.get('DISABLE_PASSWORD_LOGIN', false)
    const envIssuer = env.get('OIDC_ISSUER_URL')
    const envClientId = env.get('OIDC_CLIENT_ID')
    const envClientSecret = env.get('OIDC_CLIENT_SECRET')

    if (envIssuer && envClientId && envClientSecret) {
      const config = OidcConfig.create({
        issuerUrl: envIssuer,
        clientId: envClientId,
        clientSecret: envClientSecret,
      })
      return EffectiveAuthSettings.create({
        passwordLoginEnabled,
        oidc: config.ok ? config.value : null,
        oidcSource: 'environment',
      })
    }

    const settings = await this.repository.get()
    return EffectiveAuthSettings.create({
      passwordLoginEnabled,
      oidc: settings.oidc,
      oidcSource: settings.oidc ? 'database' : 'disabled',
    })
  }
}
