import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'

/**
 * One item read off a provider's watchlist (Plex) or favorites (Jellyfin/
 * Emby), already normalized to this app's `ExternalId` scheme — no music,
 * no provider-specific ids leak past the infrastructure layer (cf.
 * docs/phase-7-watchlist-sync, chantier 1 et 3).
 */
export interface WatchlistItem {
  kind: Extract<MediaKind, 'movie' | 'series'>
  externalId: ExternalId
  title: string
}
