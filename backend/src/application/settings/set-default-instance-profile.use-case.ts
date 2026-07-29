import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface SetDefaultInstanceProfileInput {
  id: string
}

export type SetDefaultInstanceProfileError =
  ValidationError | 'profile_not_found' | 'instance_not_found'

export class SetDefaultInstanceProfile implements UseCase<
  SetDefaultInstanceProfileInput,
  Result<InstanceProfile, SetDefaultInstanceProfileError>
> {
  constructor(
    private readonly profiles: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
  ) {}

  async execute(
    input: SetDefaultInstanceProfileInput,
  ): Promise<Result<InstanceProfile, SetDefaultInstanceProfileError>> {
    const target = await this.profiles.findById(input.id)
    if (!target) return Result.err('profile_not_found')

    const instance = await this.instances.findById(target.instanceId)
    if (!instance) return Result.err('instance_not_found')

    if (!target.isDefault) {
      const siblings = await this.profiles.listByInstance(target.instanceId)
      for (const profile of siblings) {
        if (profile.id === target.id || !profile.isDefault) continue
        profile.unmarkDefault()
        await this.profiles.save(profile)
      }

      target.markDefault()
      await this.profiles.save(target)
    }

    const configured = instance.configure(
      target.rootFolderPath,
      target.qualityProfileId,
      target.metadataProfileId,
      target.languageProfileId,
    )
    if (!configured.ok) return configured
    await this.instances.save(instance)

    return Result.ok(target)
  }
}
