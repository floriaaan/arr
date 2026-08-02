import type { ServarrKind } from './servarr-instance'
import type { MediaServerKind } from './media-server'

export type DiscoverableKind = ServarrKind | MediaServerKind

/**
 * `port` means the service answered on a well-known port but wouldn't say
 * what it is — the UI should present it as a guess, not a fact.
 */
export type DiscoveryConfidence = 'confirmed' | 'port'

export interface DiscoveredInstance {
  kind: DiscoverableKind
  baseUrl: string
  detectedVersion: string | null
  serverName: string | null
  confidence: DiscoveryConfidence
}

export interface DiscoveryScope {
  extraHost?: string
  scanSubnet: boolean
}
