import { test } from '@japa/runner'
import { OidcConfig } from '#domain/settings/oidc-config.vo'

test.group('OidcConfig', () => {
  test('accepts a valid PocketID-like configuration', ({ assert }) => {
    const result = OidcConfig.create({
      issuerUrl: 'https://pocket-id.example.com',
      clientId: 'arr',
      clientSecret: 'shh',
    })

    assert.isTrue(result.ok)
  })

  test('rejects an invalid issuer URL', ({ assert }) => {
    const result = OidcConfig.create({
      issuerUrl: 'not a url',
      clientId: 'arr',
      clientSecret: 'shh',
    })
    assert.isFalse(result.ok)
  })

  test('rejects an empty client id', ({ assert }) => {
    const result = OidcConfig.create({
      issuerUrl: 'https://pocket-id.example.com',
      clientId: '  ',
      clientSecret: 'shh',
    })
    assert.isFalse(result.ok)
  })

  test('rejects an empty client secret', ({ assert }) => {
    const result = OidcConfig.create({
      issuerUrl: 'https://pocket-id.example.com',
      clientId: 'arr',
      clientSecret: '',
    })
    assert.isFalse(result.ok)
  })
})
