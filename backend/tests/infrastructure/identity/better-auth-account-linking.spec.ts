import { test } from '@japa/runner'
import { getAuthInstance } from '#infrastructure/auth/better-auth/instance'
import { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings.vo'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'

const noOidcProvider: AuthSettingsProvider = {
  async resolveEffective() {
    return EffectiveAuthSettings.create({
      passwordLoginEnabled: true,
      oidc: null,
      oidcSource: 'disabled',
    })
  },
}

test.group('better-auth account linking config', () => {
  // Régression : un compte SSO PocketID ne se liait jamais à l'admin créé au
  // mot de passe pendant l'onboarding — better-auth résout déjà l'identité
  // OIDC par e-mail (`findOAuthUser`), mais son lien implicite par défaut
  // exige un provider dans `trustedProviders` ET un utilisateur local
  // `emailVerified`, que cette app ne renseigne jamais nulle part. Verrouille
  // la config qui lève ces deux garde-fous.
  test('trusts pocketid and does not require local email verification', async ({ assert }) => {
    const instance = await getAuthInstance(noOidcProvider)
    const accountLinking = (
      instance.options as {
        account?: {
          accountLinking?: {
            enabled?: boolean
            trustedProviders?: string[]
            requireLocalEmailVerified?: boolean
          }
        }
      }
    ).account?.accountLinking

    assert.isTrue(accountLinking?.enabled)
    assert.include(accountLinking?.trustedProviders ?? [], 'pocketid')
    assert.isFalse(accountLinking?.requireLocalEmailVerified)
  })
})
