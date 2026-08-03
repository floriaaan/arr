import type { Result } from '#domain/shared/result'
import type { ConnectionError } from '#domain/settings/connection-error.vo'

export interface MediaServerAuthResult {
  externalUserId: string
  username: string
  accessToken: string
}

/** Jellyfin/Emby username+password exchange — the password itself is never persisted. */
export interface MediaServerAuthProvider {
  authenticate(
    baseUrl: string,
    username: string,
    password: string,
  ): Promise<Result<MediaServerAuthResult, ConnectionError>>
}
