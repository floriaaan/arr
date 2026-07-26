import type { MediaRequest } from '../media-request.aggregate.js'
import type { RequestFilter } from '../request-filter.vo.js'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'

export interface MediaRequestRepository {
  findById(id: string): Promise<MediaRequest | null>
  findByFilter(filter: RequestFilter): Promise<MediaRequest[]>
  /** Used by CreateRequest to refuse a duplicate active request for the same media. */
  findByExternalId(kind: MediaKind, externalId: ExternalId): Promise<MediaRequest | null>
  save(request: MediaRequest): Promise<void>
  /** Requests in submitted/downloading/importing with an ExternalRef — what the reconciler polls. */
  findActiveWithExternalRef(): Promise<MediaRequest[]>
}
