import AuthSettingLucidModel from './auth_setting.lucid.js'
import type { AuthSettingsRepository } from '#domain/settings/interfaces/auth-settings-repository.interface'
import { AuthSettings } from '#domain/settings/auth-settings.aggregate'
import { OidcConfig } from '#domain/settings/oidc-config.vo'
import { encryptSecret, decryptSecret } from '#infrastructure/shared/encryption'

/** Singleton row — the fixed id is the whole enforcement mechanism (it's the primary key). */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

export class LucidAuthSettingsRepository implements AuthSettingsRepository {
  async get(): Promise<AuthSettings> {
    const row = await AuthSettingLucidModel.find(SINGLETON_ID)
    if (!row) return AuthSettings.create(SINGLETON_ID)

    if (!row.oidcIssuerUrl || !row.oidcClientId || !row.oidcClientSecretEncrypted) {
      return AuthSettings.reconstruct(SINGLETON_ID, { oidc: null })
    }

    const config = OidcConfig.create({
      issuerUrl: row.oidcIssuerUrl,
      clientId: row.oidcClientId,
      clientSecret: decryptSecret(row.oidcClientSecretEncrypted),
      claimsMapping: row.oidcClaimsMapping ?? undefined,
    })
    if (!config.ok) throw new Error(`Corrupted auth_settings row: ${config.error.message}`)

    return AuthSettings.reconstruct(SINGLETON_ID, { oidc: config.value })
  }

  async save(settings: AuthSettings): Promise<void> {
    const model = (await AuthSettingLucidModel.find(SINGLETON_ID)) ?? new AuthSettingLucidModel()
    model.id = SINGLETON_ID

    if (settings.oidc) {
      model.oidcIssuerUrl = settings.oidc.issuerUrl.value
      model.oidcClientId = settings.oidc.clientId
      model.oidcClientSecretEncrypted = encryptSecret(settings.oidc.clientSecret.reveal())
      model.oidcClaimsMapping = settings.oidc.claimsMapping ?? null
    } else {
      model.oidcIssuerUrl = null
      model.oidcClientId = null
      model.oidcClientSecretEncrypted = null
      model.oidcClaimsMapping = null
    }

    await model.save()
  }
}
