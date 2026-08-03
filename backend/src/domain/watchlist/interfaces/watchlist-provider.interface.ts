import type { UserMediaAccount } from '../user-media-account.aggregate.js'
import type { WatchlistItem } from '../watchlist-item.vo.js'

/** One HTTP client per `MediaServerKind` — Plex (cloud watchlist) or Jellyfin/Emby (local favorites). */
export interface WatchlistProvider {
  fetchItems(account: UserMediaAccount): Promise<WatchlistItem[]>
}

export interface LinkedAccountIdentity {
  externalUserId: string
  username: string
  accessToken: string
}
