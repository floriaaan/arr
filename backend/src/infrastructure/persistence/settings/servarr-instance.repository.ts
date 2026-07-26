import ServarrInstanceLucidModel from './servarr_instance.lucid.js'
import { toDomain, applyToModel } from './servarr-instance.mapper.js'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'

export class LucidServarrInstanceRepository implements ServarrInstanceRepository {
  async findAll(): Promise<ServarrInstance[]> {
    const rows = await ServarrInstanceLucidModel.all()
    return rows.map(toDomain)
  }

  async findByKind(kind: ServarrKind): Promise<ServarrInstance | null> {
    const row = await ServarrInstanceLucidModel.query().where('kind', kind).first()
    return row ? toDomain(row) : null
  }

  async findById(id: string): Promise<ServarrInstance | null> {
    const row = await ServarrInstanceLucidModel.find(id)
    return row ? toDomain(row) : null
  }

  async findActive(): Promise<ServarrInstance[]> {
    const rows = await ServarrInstanceLucidModel.query().where('enabled', true)
    return rows.map(toDomain)
  }

  async save(instance: ServarrInstance): Promise<void> {
    const model =
      (await ServarrInstanceLucidModel.find(instance.id)) ?? new ServarrInstanceLucidModel()
    applyToModel(instance, model)
    await model.save()
  }

  async delete(id: string): Promise<void> {
    const model = await ServarrInstanceLucidModel.find(id)
    if (model) await model.delete()
  }
}
