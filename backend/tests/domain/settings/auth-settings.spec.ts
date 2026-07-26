import { test } from '@japa/runner'
import { AuthSettings } from '#domain/settings/auth-settings.aggregate'
import { OidcConfig } from '#domain/settings/oidc-config.vo'

function anOidcConfig() {
  const result = OidcConfig.create({
    issuerUrl: 'https://pocket-id.example.com',
    clientId: 'arr',
    clientSecret: 'shh',
  })
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('AuthSettings', () => {
  test('a freshly created settings has no OIDC configuration', ({ assert }) => {
    assert.isNull(AuthSettings.create('1').oidc)
  })

  test('configureOidc() stores the configuration', ({ assert }) => {
    const settings = AuthSettings.create('1')
    settings.configureOidc(anOidcConfig())

    assert.isNotNull(settings.oidc)
  })

  test('clearOidc() removes the configuration', ({ assert }) => {
    const settings = AuthSettings.create('1')
    settings.configureOidc(anOidcConfig())
    settings.clearOidc()

    assert.isNull(settings.oidc)
  })
})
