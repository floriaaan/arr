import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  QualityProfileItem,
  QualityProfileRecord,
  ServarrQualityProfileManager,
} from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { ValidationError } from '#domain/shared/validation-error'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { SeriesType } from '#domain/settings/series-type.vo'
import { MinimumAvailability } from '#domain/settings/minimum-availability.vo'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface CreateInstanceProfileInput {
  instanceId: string
  name: string
  rootFolderPath: string
  /**
   * Pushed straight to the *arr as a brand-new Quality Profile — no
   * pre-existing id involved. Passthrough-typed like `QualityProfileRecord`
   * itself: the client round-trips whatever extra fields the *arr's schema
   * template carried (formatItems, language…) rather than this app
   * reconstructing them.
   */
  qualityProfile: Record<string, unknown> & {
    upgradeAllowed: boolean
    cutoff: number
    items: QualityProfileItem[]
  }
  metadataProfileId?: number
  languageProfileId?: number
  seriesType?: string
  minimumAvailability?: string
  /** Forced to `true` regardless when this is the instance's first profile. */
  setAsDefault?: boolean
}

export type CreateInstanceProfileError = ValidationError | 'instance_not_found' | ConnectionError

/**
 * A "profile" and a *arr Quality Profile are now the same thing from the
 * admin's point of view — creating one here creates a real Quality Profile
 * on the instance (via `ServarrQualityProfileManager`) and wraps its id in
 * the local `InstanceProfile` alongside the fields the *arr doesn't have
 * (root folder, language/metadata profile, series type, minimum
 * availability). Cf. docs/phase-3-instance-profiles/01-live-quality-profiles.md.
 */
export class CreateInstanceProfile implements UseCase<
  CreateInstanceProfileInput,
  Result<InstanceProfile, CreateInstanceProfileError>
> {
  constructor(
    private readonly profiles: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
    private readonly idGenerator: IdGenerator,
    private readonly qualityProfiles: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: CreateInstanceProfileInput,
  ): Promise<Result<InstanceProfile, CreateInstanceProfileError>> {
    const instance = await this.instances.findById(input.instanceId)
    if (!instance) return Result.err('instance_not_found')

    const rootFolderPath = RootFolderPath.create(input.rootFolderPath)
    if (!rootFolderPath.ok) return rootFolderPath

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

    const remoteProfile = await this.qualityProfiles.create(instance.kind, instance.baseUrl, instance.apiKey, {
      ...input.qualityProfile,
      name: input.name,
    } as QualityProfileRecord)
    if (!remoteProfile.ok) return remoteProfile

    const qualityProfileId = QualityProfileId.create(remoteProfile.value.id ?? 0)
    if (!qualityProfileId.ok) return qualityProfileId

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
      seriesType,
      minimumAvailability,
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
        seriesType,
        minimumAvailability,
      )
      if (!configured.ok) return configured
      await this.instances.save(instance)
    }

    await this.profiles.save(created.value)
    return Result.ok(created.value)
  }
}
