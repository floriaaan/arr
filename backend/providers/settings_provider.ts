import type { ApplicationService } from '@adonisjs/core/types'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { AuthSettingsRepository } from '#domain/settings/interfaces/auth-settings-repository.interface'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type { ServarrProfileCatalog } from '#domain/settings/interfaces/servarr-profile-catalog.interface'
import type { ServarrQualityProfileManager } from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { OidcDiscovery } from '#domain/settings/interfaces/oidc-discovery.interface'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { ServarrRegistry as ServarrRegistryType } from '#infrastructure/servarr/servarr-registry'

/**
 * Wires the settings context's ports to their infrastructure implementations,
 * plus the shared ServarrRegistry (used by both catalog_provider and
 * requests_provider) since it's built from this context's instance
 * repository — cf. docs/phase-0/01-arborescence.md.
 */
export default class SettingsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('settings.instanceRepository', async () => {
      const { LucidServarrInstanceRepository } =
        await import('#infrastructure/persistence/settings/servarr-instance.repository')
      return new LucidServarrInstanceRepository()
    })

    this.app.container.singleton('settings.instanceProfileRepository', async () => {
      const { LucidInstanceProfileRepository } =
        await import('#infrastructure/persistence/settings/instance-profile.repository')
      return new LucidInstanceProfileRepository()
    })

    this.app.container.singleton('settings.authSettingsRepository', async () => {
      const { LucidAuthSettingsRepository } =
        await import('#infrastructure/persistence/settings/auth-settings.repository')
      return new LucidAuthSettingsRepository()
    })

    this.app.container.singleton('settings.onboardingStateRepository', async () => {
      const { LucidOnboardingStateRepository } =
        await import('#infrastructure/persistence/settings/onboarding-state.repository')
      return new LucidOnboardingStateRepository()
    })

    this.app.container.singleton('settings.connectionTester', async () => {
      const { HttpServarrConnectionTester } =
        await import('#infrastructure/servarr/connection-tester')
      return new HttpServarrConnectionTester()
    })

    this.app.container.singleton('settings.profileCatalog', async () => {
      const { HttpServarrProfileCatalog } = await import('#infrastructure/servarr/profile-catalog')
      return new HttpServarrProfileCatalog()
    })

    this.app.container.singleton('settings.qualityProfileManager', async () => {
      const { HttpServarrQualityProfileManager } =
        await import('#infrastructure/servarr/quality-profile-manager')
      return new HttpServarrQualityProfileManager()
    })

    this.app.container.singleton('settings.oidcDiscovery', async () => {
      const { WellKnownOidcDiscovery } = await import('#infrastructure/auth/oidc-discovery.adapter')
      return new WellKnownOidcDiscovery()
    })

    this.app.container.singleton('settings.authSettingsProvider', async (resolver) => {
      const { EnvAuthSettingsProvider } =
        await import('#infrastructure/auth/env-auth-settings-provider')
      const repository = await resolver.make('settings.authSettingsRepository')
      return new EnvAuthSettingsProvider(repository)
    })

    this.app.container.singleton('servarr.registry', async (resolver) => {
      const { ServarrRegistry } = await import('#infrastructure/servarr/servarr-registry')
      const instanceRepository = await resolver.make('settings.instanceRepository')
      return new ServarrRegistry(instanceRepository)
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'settings.instanceRepository': ServarrInstanceRepository
    'settings.instanceProfileRepository': InstanceProfileRepository
    'settings.authSettingsRepository': AuthSettingsRepository
    'settings.onboardingStateRepository': OnboardingStateRepository
    'settings.connectionTester': ServarrConnectionTester
    'settings.profileCatalog': ServarrProfileCatalog
    'settings.qualityProfileManager': ServarrQualityProfileManager
    'settings.oidcDiscovery': OidcDiscovery
    'settings.authSettingsProvider': AuthSettingsProvider
    'servarr.registry': ServarrRegistryType
  }
}
