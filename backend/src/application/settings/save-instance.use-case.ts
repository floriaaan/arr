import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface SaveInstanceInput {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  enabled: boolean
}

export type SaveInstanceError = ConnectionError | ValidationError

export class SaveInstance implements UseCase<
  SaveInstanceInput,
  Result<ServarrInstance, SaveInstanceError>
> {
  constructor(
    private readonly repository: ServarrInstanceRepository,
    private readonly tester: ServarrConnectionTester,
    private readonly idGenerator: IdGenerator,
    private readonly instanceProfiles: InstanceProfileRepository,
  ) {}

  async execute(input: SaveInstanceInput): Promise<Result<ServarrInstance, SaveInstanceError>> {
    const baseUrl = Url.create(input.baseUrl)
    if (!baseUrl.ok) return baseUrl

    const apiKey = ApiKey.create(input.apiKey)
    if (!apiKey.ok) return apiKey

    const rootFolderPath = RootFolderPath.create(input.rootFolderPath)
    if (!rootFolderPath.ok) return rootFolderPath

    const qualityProfileId = QualityProfileId.create(input.qualityProfileId)
    if (!qualityProfileId.ok) return qualityProfileId

    let metadataProfileId: MetadataProfileId | null = null
    if (input.metadataProfileId !== undefined) {
      const result = MetadataProfileId.create(input.metadataProfileId)
      if (!result.ok) return result
      metadataProfileId = result.value
    }

    let languageProfileId: LanguageProfileId | null = null
    if (input.languageProfileId !== undefined) {
      const result = LanguageProfileId.create(input.languageProfileId)
      if (!result.ok) return result
      languageProfileId = result.value
    }

    const existing = await this.repository.findByKind(input.kind)
    const instance =
      existing ??
      ServarrInstance.draft(this.idGenerator.next(), input.kind, baseUrl.value, apiKey.value)

    if (existing) {
      instance.updateConnection(baseUrl.value, apiKey.value)
    }

    const configured = instance.configure(
      rootFolderPath.value,
      qualityProfileId.value,
      metadataProfileId,
      languageProfileId,
    )
    if (!configured.ok) return configured

    const existingProfiles = await this.instanceProfiles.listByInstance(instance.id)
    if (existingProfiles.length === 0) {
      const defaultProfile = InstanceProfile.create(
        this.idGenerator.next(),
        input.kind,
        instance.id,
        'Default',
        rootFolderPath.value,
        qualityProfileId.value,
        metadataProfileId,
        languageProfileId,
        true,
      )
      if (!defaultProfile.ok) return defaultProfile
      await this.instanceProfiles.save(defaultProfile.value)
    }

    if (input.enabled) {
      const health = await this.tester.test(input.kind, baseUrl.value, apiKey.value)
      if (!health.ok) return health

      instance.recordHealthCheck(health.value)
      const enabled = instance.enable()
      if (!enabled.ok) return enabled
    } else {
      instance.disable()
    }

    await this.repository.save(instance)
    return Result.ok(instance)
  }
}
