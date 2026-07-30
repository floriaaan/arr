import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '../servarr-kind.vo.js'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'
import type { ServarrField } from '../servarr-field.js'

/**
 * Deliberately not fully modeled beyond the fields every implementation
 * shares — `fields[]` itself (baseUrl/apiKey/categories for a Torznab
 * indexer, etc.) varies per `implementation` and round-trips through this
 * app unmodified, same rationale as `QualityProfileRecord`.
 */
export type IndexerRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  /** Required by the *arr on create/update — comes from the schema template, never typed by hand. */
  configContract: string
  protocol: 'torrent' | 'usenet'
  enableRss: boolean
  enableAutomaticSearch: boolean
  enableInteractiveSearch: boolean
  priority: number
  fields: ServarrField[]
}

export interface ServarrIndexerManager {
  list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<IndexerRecord[], ConnectionError>>
  /** One template per supported implementation, mirroring the *arr's own "add" form. */
  getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<IndexerRecord[], ConnectionError>>
  create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: IndexerRecord,
  ): Promise<Result<IndexerRecord, ConnectionError>>
  update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: IndexerRecord,
  ): Promise<Result<IndexerRecord, ConnectionError>>
  delete(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
  ): Promise<Result<void, ConnectionError>>
  test(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: IndexerRecord,
  ): Promise<Result<void, ConnectionError>>
}
