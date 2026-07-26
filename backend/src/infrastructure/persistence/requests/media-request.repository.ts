import MediaRequestLucidModel from './media_request.lucid.js'
import { toDomain, applyToModel } from './media-request.mapper.js'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { RequestFilter } from '#domain/requests/request-filter.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'

const ACTIVE_STATUSES = ['submitted', 'downloading', 'importing']

export class LucidMediaRequestRepository implements MediaRequestRepository {
  async findById(id: string): Promise<MediaRequest | null> {
    const row = await MediaRequestLucidModel.find(id)
    return row ? toDomain(row) : null
  }

  async findByFilter(filter: RequestFilter): Promise<MediaRequest[]> {
    const query = MediaRequestLucidModel.query()
    if (filter.status) query.where('status', filter.status)
    if (filter.kind) query.where('kind', filter.kind)
    if (filter.requestedBy) query.where('requestedByUserId', filter.requestedBy)

    const rows = await query.orderBy('createdAt', 'desc')
    return rows.map(toDomain)
  }

  async findByExternalId(kind: MediaKind, externalId: ExternalId): Promise<MediaRequest | null> {
    const row = await MediaRequestLucidModel.query()
      .where('kind', kind)
      .where('externalIdScheme', externalId.scheme)
      .where('externalIdValue', externalId.value)
      .first()
    return row ? toDomain(row) : null
  }

  async save(request: MediaRequest): Promise<void> {
    const model = (await MediaRequestLucidModel.find(request.id)) ?? new MediaRequestLucidModel()
    applyToModel(request, model)
    await model.save()
  }

  async findActiveWithExternalRef(): Promise<MediaRequest[]> {
    const rows = await MediaRequestLucidModel.query()
      .whereIn('status', ACTIVE_STATUSES)
      .whereNotNull('externalRefRemoteId')

    return rows.map(toDomain)
  }
}
