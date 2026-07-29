import type { UseCase } from '#application/shared/use-case'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export interface ListInstanceProfilesInput {
  instanceId: string
}

export class ListInstanceProfiles implements UseCase<ListInstanceProfilesInput, InstanceProfile[]> {
  constructor(private readonly repository: InstanceProfileRepository) {}

  async execute(input: ListInstanceProfilesInput): Promise<InstanceProfile[]> {
    return this.repository.listByInstance(input.instanceId)
  }
}
