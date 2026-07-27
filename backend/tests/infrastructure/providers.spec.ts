import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

test.group('service provider bindings', () => {
  test('every Phase 3/4 container binding resolves without throwing', async ({ assert }) => {
    const bindings = [
      'shared.clock',
      'shared.idGenerator',
      'identity.userDirectory',
      'identity.authentication',
      'identity.session',
      'identity.accountRegistrar',
      'identity.authHandler',
      'settings.instanceRepository',
      'settings.authSettingsRepository',
      'settings.onboardingStateRepository',
      'settings.connectionTester',
      'settings.profileCatalog',
      'settings.oidcDiscovery',
      'settings.authSettingsProvider',
      'servarr.registry',
      'catalog.mediaLookup',
      'requests.repository',
      'requests.provisioning',
      'requests.downloadProgress',
      'images.proxyService',
    ] as const

    for (const binding of bindings) {
      const resolved = await app.container.make(binding)
      assert.isDefined(resolved, `binding "${binding}" resolved to a defined value`)
    }
  })
})
