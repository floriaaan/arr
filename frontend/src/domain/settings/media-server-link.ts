import type { MediaServerDto, MediaServerKind } from './media-server'

/**
 * Search paths rather than per-item deep links: this app knows an item's
 * TMDb/TVDb/MusicBrainz id, never its Plex `ratingKey` or its Jellyfin/Emby
 * `ItemId`, and resolving those would need a token plus one API call per
 * item — which the "no credential stored" decision rules out (cf.
 * docs/phase-5-quality-of-life, chantier 2 décisions 1 et 3).
 *
 * Jellyfin and Emby share the same web client lineage, hence the same
 * `search.html` route; Plex's web client uses `search` instead.
 */
const SEARCH_PATH: Record<MediaServerKind, string> = {
  plex: '/web/index.html#!/search?query=',
  jellyfin: '/web/index.html#!/search.html?query=',
  emby: '/web/index.html#!/search.html?query=',
}

/** Trailing slashes are already stripped server-side by the `Url` VO — belt and braces. */
export function buildMediaServerSearchUrl(server: MediaServerDto, title: string): string {
  const baseUrl = server.baseUrl.replace(/\/+$/, '')
  return `${baseUrl}${SEARCH_PATH[server.kind]}${encodeURIComponent(title)}`
}
