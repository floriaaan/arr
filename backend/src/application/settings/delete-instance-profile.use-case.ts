import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import { Result } from '#domain/shared/result'

export interface DeleteInstanceProfileInput {
  id: string
}

export type DeleteInstanceProfileError = 'profile_not_found' | 'default_profile_delete_forbidden'

export class DeleteInstanceProfile implements UseCase<
  DeleteInstanceProfileInput,
  Result<void, DeleteInstanceProfileError>
> {
  constructor(private readonly repository: InstanceProfileRepository) {}

  async execute(
    input: DeleteInstanceProfileInput,
  ): Promise<Result<void, DeleteInstanceProfileError>> {
    const profile = await this.repository.findById(input.id)
    if (!profile) return Result.err('profile_not_found')
    if (profile.isDefault) return Result.err('default_profile_delete_forbidden')

    await this.repository.delete(input.id)
    return Result.ok(undefined)
  }
}
