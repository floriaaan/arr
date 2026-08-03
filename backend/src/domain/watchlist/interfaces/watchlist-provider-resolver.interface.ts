import type { WatchlistProvider } from './watchlist-provider.interface.js'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

/** What `SyncWatchlist` depends on — kept separate from the concrete registry so application never imports infrastructure. */
export interface WatchlistProviderResolver {
  resolve(kind: MediaServerKind): WatchlistProvider
}
