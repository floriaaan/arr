import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { SeriesType } from '#domain/settings/series-type.vo'
import { MinimumAvailability } from '#domain/settings/minimum-availability.vo'
import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface UpdateInstanceProfileInput {
  id: string
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  seriesType?: string
  minimumAvailability?: string
}

export type UpdateInstanceProfileError =
  ValidationError | 'profile_not_found' | 'instance_not_found'

/** Full replace, like `SaveInstance` — not a partial PATCH. */
export class UpdateInstanceProfile implements UseCase<
  UpdateInstanceProfileInput,
  Result<InstanceProfile, UpdateInstanceProfileError>
> {
  constructor(
    private readonly profiles: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
  ) {}

  async execute(
    input: UpdateInstanceProfileInput,
  ): Promise<Result<InstanceProfile, UpdateInstanceProfileError>> {
    const profile = await this.profiles.findById(input.id)
    if (!profile) return Result.err('profile_not_found')

    const instance = await this.instances.findById(profile.instanceId)
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

    let seriesType: SeriesType | null = null
    if (input.seriesType !== undefined) {
      const result = SeriesType.create(input.seriesType)
      if (!result.ok) return result
      seriesType = result.value
    }

    let minimumAvailability: MinimumAvailability | null = null
    if (input.minimumAvailability !== undefined) {
      const result = MinimumAvailability.create(input.minimumAvailability)
      if (!result.ok) return result
      minimumAvailability = result.value
    }

    const renamed = profile.rename(input.name)
    if (!renamed.ok) return renamed

    const updated = profile.updateSelection(
      instance.kind,
      rootFolderPath.value,
      qualityProfileId.value,
      metadataProfileId,
      languageProfileId,
      seriesType,
      minimumAvailability,
    )
    if (!updated.ok) return updated

    await this.profiles.save(profile)

    if (profile.isDefault) {
      const configured = instance.configure(
        rootFolderPath.value,
        qualityProfileId.value,
        metadataProfileId,
        languageProfileId,
        seriesType,
        minimumAvailability,
      )
      if (!configured.ok) return configured
      await this.instances.save(instance)
    }

    return Result.ok(profile)
  }
}
