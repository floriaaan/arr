import type { InstanceProfile } from '../instance-profile.aggregate.js'

export interface InstanceProfileRepository {
  listByInstance(instanceId: string): Promise<InstanceProfile[]>
  findById(id: string): Promise<InstanceProfile | null>
  save(profile: InstanceProfile): Promise<void>
  delete(id: string): Promise<void>
}
