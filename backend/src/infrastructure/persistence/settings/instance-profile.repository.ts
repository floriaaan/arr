import InstanceProfileLucidModel from './instance_profile.lucid.js'
import { toDomain, applyToModel } from './instance-profile.mapper.js'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

export class LucidInstanceProfileRepository implements InstanceProfileRepository {
  async listByInstance(instanceId: string): Promise<InstanceProfile[]> {
    const rows = await InstanceProfileLucidModel.query()
      .where('instanceId', instanceId)
      .orderBy('createdAt', 'asc')
    return rows.map(toDomain)
  }

  async findById(id: string): Promise<InstanceProfile | null> {
    const row = await InstanceProfileLucidModel.find(id)
    return row ? toDomain(row) : null
  }

  async save(profile: InstanceProfile): Promise<void> {
    const model =
      (await InstanceProfileLucidModel.find(profile.id)) ?? new InstanceProfileLucidModel()
    applyToModel(profile, model)
    await model.save()
  }

  async delete(id: string): Promise<void> {
    const model = await InstanceProfileLucidModel.find(id)
    if (model) await model.delete()
  }
}
