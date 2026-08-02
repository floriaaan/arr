import MediaRequestLucidModel from './media_request.lucid.js'
import { toDomain, applyToModel } from './media-request.mapper.js'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { RequestFilter } from '#domain/requests/request-filter.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'

const ACTIVE_STATUSES = ['submitted', 'downloading', 'importing']

/**
 * Statuses that make a title "already requested". `available` stays in the
 * list — re-requesting something already in the library is meaningless — but
 * `cancelled` and `failed` deliberately do not, so a bad grab no longer
 * condemns a title forever (cf. docs/phase-6-fiabilite-requests, chantier 2).
 * Mirrors the partial unique index in
 * `1785081146200_relax_media_requests_unique_to_live_statuses.ts`.
 */
const LIVE_STATUSES = ['pending', 'submitted', 'downloading', 'importing', 'available']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class LucidMediaRequestRepository implements MediaRequestRepository {
  async findById(id: string): Promise<MediaRequest | null> {
    // `id` is a `uuid` column — an arbitrary route param (e.g. from a stale
    // link or a client typo) that isn't UUID-shaped would otherwise reach
    // Postgres and raise a raw "invalid input syntax for type uuid" error
    // instead of the clean "not found" this actually is.
    if (!UUID_PATTERN.test(id)) return null

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
      .whereIn('status', LIVE_STATUSES)
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
