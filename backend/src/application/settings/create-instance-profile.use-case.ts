import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface CreateInstanceProfileInput {
  instanceId: string
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  /** Forced to `true` regardless when this is the instance's first profile. */
  setAsDefault?: boolean
}

export type CreateInstanceProfileError = ValidationError | 'instance_not_found'

export class CreateInstanceProfile implements UseCase<
  CreateInstanceProfileInput,
  Result<InstanceProfile, CreateInstanceProfileError>
> {
  constructor(
    private readonly profiles: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    input: CreateInstanceProfileInput,
  ): Promise<Result<InstanceProfile, CreateInstanceProfileError>> {
    const instance = await this.instances.findById(input.instanceId)
    if (!instance) return Result.err('instance_not_found')

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

    const existing = await this.profiles.listByInstance(instance.id)
    const isDefault = input.setAsDefault === true || existing.length === 0

    const created = InstanceProfile.create(
      this.idGenerator.next(),
      instance.kind,
      instance.id,
      input.name,
      rootFolderPath.value,
      qualityProfileId.value,
      metadataProfileId,
      languageProfileId,
      isDefault,
    )
    if (!created.ok) return created

    if (isDefault) {
      for (const profile of existing) {
        if (!profile.isDefault) continue
        profile.unmarkDefault()
        await this.profiles.save(profile)
      }

      const configured = instance.configure(
        rootFolderPath.value,
        qualityProfileId.value,
        metadataProfileId,
        languageProfileId,
      )
      if (!configured.ok) return configured
      await this.instances.save(instance)
    }

    await this.profiles.save(created.value)
    return Result.ok(created.value)
  }
}
