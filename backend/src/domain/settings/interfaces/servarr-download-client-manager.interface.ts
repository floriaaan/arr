import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '../servarr-kind.vo.js'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'
import type { ServarrField } from '../servarr-field.js'

/**
 * Deliberately not fully modeled beyond the fields every implementation
 * shares — `fields[]` itself (host/port/category for qBittorrent,
 * host/apiKey for SABnzbd, etc.) varies per `implementation` and round-trips
 * through this app unmodified, same rationale as `QualityProfileRecord`.
 */
export type DownloadClientRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  /** Required by the *arr on create/update — comes from the schema template, never typed by hand. */
  configContract: string
  protocol: 'torrent' | 'usenet'
  enable: boolean
  priority: number
  fields: ServarrField[]
}

export interface ServarrDownloadClientManager {
  list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<DownloadClientRecord[], ConnectionError>>
  /** One template per supported implementation, mirroring the *arr's own "add" form. */
  getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<DownloadClientRecord[], ConnectionError>>
  create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: DownloadClientRecord,
  ): Promise<Result<DownloadClientRecord, ConnectionError>>
  update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: DownloadClientRecord,
  ): Promise<Result<DownloadClientRecord, ConnectionError>>
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
    payload: DownloadClientRecord,
  ): Promise<Result<void, ConnectionError>>
}
