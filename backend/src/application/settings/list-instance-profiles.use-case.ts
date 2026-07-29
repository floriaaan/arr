import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface ListInstanceProfilesInput {
  instanceId: string
}

/**
 * Self-healing backfill: an instance configured before `instance_profiles`
 * existed (or one saved through the old inline form and never touched
 * again since) has zero rows here despite already carrying a root folder
 * and quality profile on `servarr_instances` — synthesize and persist its
 * "Default" profile on first read rather than showing an empty list forever.
 */
export class ListInstanceProfiles implements UseCase<ListInstanceProfilesInput, InstanceProfile[]> {
  constructor(
    private readonly profiles: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: ListInstanceProfilesInput): Promise<InstanceProfile[]> {
    const existing = await this.profiles.listByInstance(input.instanceId)
    if (existing.length > 0) return existing

    const instance = await this.instances.findById(input.instanceId)
    if (!instance?.rootFolderPath || !instance.qualityProfileId) return existing

    const backfilled = InstanceProfile.create(
      this.idGenerator.next(),
      instance.kind,
      instance.id,
      'Default',
      instance.rootFolderPath,
      instance.qualityProfileId,
      instance.metadataProfileId,
      instance.languageProfileId,
      instance.seriesType,
      instance.minimumAvailability,
      true,
    )
    if (!backfilled.ok) return existing

    await this.profiles.save(backfilled.value)
    return [backfilled.value]
  }
}
