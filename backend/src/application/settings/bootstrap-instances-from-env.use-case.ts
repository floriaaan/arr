import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type { ServarrProfileCatalog } from '#domain/settings/interfaces/servarr-profile-catalog.interface'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { Clock } from '#domain/shared/clock.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { SaveInstance } from './save-instance.use-case.js'

export interface EnvInstanceConfig {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
}

export interface BootstrapInstancesFromEnvResult {
  bootstrapped: ServarrKind[]
  skippedExisting: ServarrKind[]
  failed: Array<{ kind: ServarrKind; reason: string }>
}

/**
 * Pre-creates *arr instances from env vars (SONARR_URL/SONARR_API_KEY etc.)
 * for drop-in docker-compose setups, cf. docs/adr/0010. Never overwrites an
 * instance already saved from the UI — an instance found by `findByKind` is
 * left untouched, unlike the OIDC env precedence which always wins.
 */
export class BootstrapInstancesFromEnv implements UseCase<
  EnvInstanceConfig[],
  BootstrapInstancesFromEnvResult
> {
  constructor(
    private readonly repository: ServarrInstanceRepository,
    private readonly tester: ServarrConnectionTester,
    private readonly catalog: ServarrProfileCatalog,
    private readonly idGenerator: IdGenerator,
    private readonly instanceProfiles: InstanceProfileRepository,
    private readonly onboardingState: OnboardingStateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(configs: EnvInstanceConfig[]): Promise<BootstrapInstancesFromEnvResult> {
    const result: BootstrapInstancesFromEnvResult = {
      bootstrapped: [],
      skippedExisting: [],
      failed: [],
    }

    for (const config of configs) {
      const outcome = await this.bootstrapOne(config)
      if (outcome === 'skipped') result.skippedExisting.push(config.kind)
      else if (outcome === 'bootstrapped') result.bootstrapped.push(config.kind)
      else result.failed.push({ kind: config.kind, reason: outcome.reason })
    }

    if (result.bootstrapped.length > 0) {
      const state = await this.onboardingState.get()
      if (state.status === 'admin_created') {
        const marked = state.markServicesConfigured(this.clock.now())
        if (marked.ok) await this.onboardingState.save(state)
      }
    }

    return result
  }

  private async bootstrapOne(
    config: EnvInstanceConfig,
  ): Promise<'skipped' | 'bootstrapped' | { reason: string }> {
    const existing = await this.repository.findByKind(config.kind)
    if (existing) return 'skipped'

    const baseUrl = Url.create(config.baseUrl)
    if (!baseUrl.ok) return { reason: baseUrl.error.message }

    const apiKey = ApiKey.create(config.apiKey)
    if (!apiKey.ok) return { reason: apiKey.error.message }

    const rootFolders = await this.catalog.listRootFolders(config.kind, baseUrl.value, apiKey.value)
    if (!rootFolders.ok || rootFolders.value.length === 0) {
      return { reason: !rootFolders.ok ? rootFolders.error.message : 'no root folder configured' }
    }

    const qualityProfiles = await this.catalog.listQualityProfiles(
      config.kind,
      baseUrl.value,
      apiKey.value,
    )
    if (!qualityProfiles.ok || qualityProfiles.value.length === 0) {
      return {
        reason: !qualityProfiles.ok
          ? qualityProfiles.error.message
          : 'no quality profile configured',
      }
    }

    const rootFolder = rootFolders.value[0]
    const qualityProfile = qualityProfiles.value[0]
    if (!rootFolder || !qualityProfile) {
      return { reason: 'no root folder or quality profile configured' }
    }

    const saveInstance = new SaveInstance(
      this.repository,
      this.tester,
      this.idGenerator,
      this.instanceProfiles,
    )
    const saved = await saveInstance.execute({
      kind: config.kind,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      rootFolderPath: rootFolder.path,
      qualityProfileId: qualityProfile.id,
      enabled: true,
    })

    if (!saved.ok) {
      return { reason: saved.error.message }
    }

    return 'bootstrapped'
  }
}
