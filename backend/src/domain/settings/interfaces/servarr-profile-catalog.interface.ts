import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '../servarr-kind.vo.js'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'

export interface RootFolderOption {
  path: string
}

export interface ProfileOption {
  id: number
  name: string
}

export interface ServarrProfileCatalog {
  listRootFolders(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<RootFolderOption[], ConnectionError>>
  listQualityProfiles(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>>
  /** Lidarr only. */
  listMetadataProfiles(
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>>
  /** Sonarr only. */
  listLanguageProfiles(
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<ProfileOption[], ConnectionError>>
}
