import { PlexClient } from './plex-client.js'
import { JellyfinLikeClient } from './jellyfin-like-client.js'
import type { WatchlistProvider } from '#domain/watchlist/interfaces/watchlist-provider.interface'
import type { WatchlistProviderResolver } from '#domain/watchlist/interfaces/watchlist-provider-resolver.interface'
import type { PlexLinkProvider } from '#domain/watchlist/interfaces/plex-link-provider.interface'
import type { MediaServerAuthProvider } from '#domain/watchlist/interfaces/media-server-auth-provider.interface'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

/**
 * Single home for the three stateless clients — `PlexClient` doubles as
 * `PlexLinkProvider`, `JellyfinLikeClient` doubles as `MediaServerAuthProvider`,
 * so the same instances back both the sync job and the link flows.
 */
export class WatchlistProviderRegistry implements WatchlistProviderResolver {
  private readonly plexClient = new PlexClient()
  private readonly jellyfinClient = new JellyfinLikeClient('', 'MediaBrowser')
  private readonly embyClient = new JellyfinLikeClient('/emby', 'Emby')

  resolve(kind: MediaServerKind): WatchlistProvider {
    switch (kind) {
      case 'plex':
        return this.plexClient
      case 'jellyfin':
        return this.jellyfinClient
      case 'emby':
        return this.embyClient
    }
  }

  resolvePlexLink(): PlexLinkProvider {
    return this.plexClient
  }

  resolveAuthProvider(
    kind: Extract<MediaServerKind, 'jellyfin' | 'emby'>,
  ): MediaServerAuthProvider {
    return kind === 'jellyfin' ? this.jellyfinClient : this.embyClient
  }
}
