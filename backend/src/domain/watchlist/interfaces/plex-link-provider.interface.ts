import type { Result } from '#domain/shared/result'
import type { ConnectionError } from '#domain/settings/connection-error.vo'

export interface PlexPin {
  id: number
  code: string
  clientIdentifier: string
}

export interface PlexLinkedUser {
  id: string
  username: string
}

/**
 * The PIN device-code flow (`plex.tv/api/v2/pins`) — separate from
 * `WatchlistProvider` because linking needs more than `fetchItems()` (cf.
 * docs/phase-7-watchlist-sync, chantier 2 décision 2).
 */
export interface PlexLinkProvider {
  createPin(): Promise<Result<PlexPin, ConnectionError>>
  authUrl(pin: PlexPin): string
  /** `Result.ok(null)` while the user hasn't authorized in their browser yet. */
  pollPin(pin: PlexPin): Promise<Result<string | null, ConnectionError>>
  fetchUser(pin: PlexPin, authToken: string): Promise<Result<PlexLinkedUser, ConnectionError>>
}
