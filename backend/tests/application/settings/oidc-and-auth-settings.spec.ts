import { test } from '@japa/runner'
import { TestOidcDiscovery } from '#application/settings/test-oidc-discovery.use-case'
import { SaveAuthSettings } from '#application/settings/save-auth-settings.use-case'
import { GetEffectiveAuthSettings } from '#application/settings/get-effective-auth-settings.use-case'
import { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings.vo'
import { Result } from '#domain/shared/result'
import {
  FakeOidcDiscovery,
  InMemoryAuthSettingsRepository,
  FakeAuthSettingsProvider,
} from './fakes.js'

test.group('TestOidcDiscovery', () => {
  test('rejects a malformed issuer URL before calling discovery', async ({ assert }) => {
    const discovery = new FakeOidcDiscovery()
    const useCase = new TestOidcDiscovery(discovery)

    const result = await useCase.execute({
      issuerUrl: 'not a url',
      clientId: 'arr',
      clientSecret: 'shh',
    })

    assert.isFalse(result.ok)
  })

  test('returns the discovery info on success', async ({ assert }) => {
    const discovery = new FakeOidcDiscovery()
    discovery.nextResult = Result.ok({
      authorizationEndpoint: 'https://pocket-id.example.com/authorize',
      tokenEndpoint: 'https://pocket-id.example.com/token',
      userinfoEndpoint: 'https://pocket-id.example.com/userinfo',
    })
    const useCase = new TestOidcDiscovery(discovery)

    const result = await useCase.execute({
      issuerUrl: 'https://pocket-id.example.com',
      clientId: 'arr',
      clientSecret: 'shh',
    })

    assert.isTrue(result.ok)
  })
})

test.group('SaveAuthSettings', () => {
  test('stores a valid OIDC configuration', async ({ assert }) => {
    const repository = new InMemoryAuthSettingsRepository()
    const useCase = new SaveAuthSettings(repository)

    const result = await useCase.execute({
      oidc: { issuerUrl: 'https://pocket-id.example.com', clientId: 'arr', clientSecret: 'shh' },
    })

    assert.isTrue(result.ok)
    const settings = await repository.get()
    assert.isNotNull(settings.oidc)
  })

  test('clears the configuration when oidc is null', async ({ assert }) => {
    const repository = new InMemoryAuthSettingsRepository()
    const useCase = new SaveAuthSettings(repository)
    await useCase.execute({
      oidc: { issuerUrl: 'https://pocket-id.example.com', clientId: 'arr', clientSecret: 'shh' },
    })

    const result = await useCase.execute({ oidc: null })

    assert.isTrue(result.ok)
    const settings = await repository.get()
    assert.isNull(settings.oidc)
  })

  test('rejects an invalid configuration', async ({ assert }) => {
    const repository = new InMemoryAuthSettingsRepository()
    const useCase = new SaveAuthSettings(repository)

    const result = await useCase.execute({
      oidc: { issuerUrl: 'not a url', clientId: 'arr', clientSecret: 'shh' },
    })

    assert.isFalse(result.ok)
  })
})

test.group('GetEffectiveAuthSettings', () => {
  test('delegates to the provider', async ({ assert }) => {
    const effective = EffectiveAuthSettings.create({
      passwordLoginEnabled: true,
      oidc: null,
      oidcSource: 'disabled',
    })
    const useCase = new GetEffectiveAuthSettings(new FakeAuthSettingsProvider(effective))

    const result = await useCase.execute()

    assert.isTrue(result.passwordLoginEnabled)
  })
})
