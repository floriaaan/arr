import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrQualityProfileManager } from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface DeleteInstanceProfileInput {
  id: string
}

export type DeleteInstanceProfileError =
  'profile_not_found' | 'default_profile_delete_forbidden' | 'instance_not_found' | ConnectionError

/** Deletes the local profile and the Quality Profile it created on the *arr — the two are the same thing. */
export class DeleteInstanceProfile implements UseCase<
  DeleteInstanceProfileInput,
  Result<void, DeleteInstanceProfileError>
> {
  constructor(
    private readonly repository: InstanceProfileRepository,
    private readonly instances: ServarrInstanceRepository,
    private readonly qualityProfiles: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: DeleteInstanceProfileInput,
  ): Promise<Result<void, DeleteInstanceProfileError>> {
    const profile = await this.repository.findById(input.id)
    if (!profile) return Result.err('profile_not_found')
    if (profile.isDefault) return Result.err('default_profile_delete_forbidden')

    const instance = await this.instances.findById(profile.instanceId)
    if (!instance) return Result.err('instance_not_found')

    const deletedRemote = await this.qualityProfiles.delete(
      instance.kind,
      instance.baseUrl,
      instance.apiKey,
      profile.qualityProfileId.value,
    )
    if (!deletedRemote.ok) return deletedRemote

    await this.repository.delete(input.id)
    return Result.ok(undefined)
  }
}
