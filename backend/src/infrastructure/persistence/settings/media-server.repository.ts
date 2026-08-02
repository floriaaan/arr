import MediaServerLucidModel from './media_server.lucid.js'
import { toDomain, applyToModel } from './media-server.mapper.js'
import type { MediaServerRepository } from '#domain/settings/interfaces/media-server-repository.interface'
import type { MediaServer } from '#domain/settings/media-server.aggregate'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export class LucidMediaServerRepository implements MediaServerRepository {
  async findAll(): Promise<MediaServer[]> {
    const rows = await MediaServerLucidModel.all()
    return rows.map(toDomain)
  }

  async findByKind(kind: MediaServerKind): Promise<MediaServer | null> {
    const row = await MediaServerLucidModel.query().where('kind', kind).first()
    return row ? toDomain(row) : null
  }

  async save(server: MediaServer): Promise<void> {
    const model = (await MediaServerLucidModel.find(server.id)) ?? new MediaServerLucidModel()
    applyToModel(server, model)
    await model.save()
  }

  async delete(id: string): Promise<void> {
    const model = await MediaServerLucidModel.find(id)
    if (model) await model.delete()
  }
}
