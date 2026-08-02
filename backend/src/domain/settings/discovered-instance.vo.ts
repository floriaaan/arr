import type { ServarrKind } from './servarr-kind.vo.js'
import type { MediaServerKind } from './media-server-kind.vo.js'

export type DiscoverableKind = ServarrKind | MediaServerKind

/**
 * `confirmed` — the service identified itself (an *arr's login `<title>`, a
 * Plex `<MediaContainer>`, a Jellyfin/Emby `ProductName`).
 * `port` — something answered on a well-known port but wouldn't say what it
 * is (a reverse proxy rewriting the HTML, typically), so the kind is a guess
 * from the port alone and the UI should say so.
 */
export type DiscoveryConfidence = 'confirmed' | 'port'

export interface DiscoveredInstance {
  kind: DiscoverableKind
  baseUrl: string
  detectedVersion: string | null
  /** Only Jellyfin/Emby advertise a name on their public endpoint. */
  serverName: string | null
  confidence: DiscoveryConfidence
}
