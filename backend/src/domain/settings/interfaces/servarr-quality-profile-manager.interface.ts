import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '../servarr-kind.vo.js'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'

export interface QualityProfileItem {
  id?: number
  name?: string
  allowed: boolean
  quality?: { id: number; name: string; source?: string; resolution?: number }
  /** Nested group — rare, only present when hand-crafted in the *arr's own UI. */
  items?: QualityProfileItem[]
}

/**
 * Deliberately not fully modeled — `formatItems`, `minFormatScore`,
 * `language`, etc. vary subtly across Radarr/Sonarr/Lidarr and this app
 * only ever edits `name`/`upgradeAllowed`/`cutoff`/`items[].allowed`.
 * Everything else round-trips through this app unmodified rather than
 * being reconstructed field by field (cf. docs/phase-3-instance-profiles/01).
 */
export type QualityProfileRecord = Record<string, unknown> & {
  id?: number
  name: string
  upgradeAllowed: boolean
  cutoff: number
  items: QualityProfileItem[]
}

export interface ServarrQualityProfileManager {
  list(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<QualityProfileRecord[], ConnectionError>>
  /** Template for a brand-new profile, mirroring the *arr's own "add" form. */
  getSchema(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<QualityProfileRecord, ConnectionError>>
  create(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    payload: QualityProfileRecord,
  ): Promise<Result<QualityProfileRecord, ConnectionError>>
  update(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
    payload: QualityProfileRecord,
  ): Promise<Result<QualityProfileRecord, ConnectionError>>
  delete(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
    id: number,
  ): Promise<Result<void, ConnectionError>>
}
