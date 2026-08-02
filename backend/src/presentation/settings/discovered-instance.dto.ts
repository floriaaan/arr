import type { DiscoveredInstance } from '#domain/settings/discovered-instance.vo'

export interface DiscoveredInstanceDto {
  kind: string
  baseUrl: string
  detectedVersion: string | null
  serverName: string | null
  confidence: string
}

export function toDiscoveredInstanceDto(instance: DiscoveredInstance): DiscoveredInstanceDto {
  return {
    kind: instance.kind,
    baseUrl: instance.baseUrl,
    detectedVersion: instance.detectedVersion,
    serverName: instance.serverName,
    confidence: instance.confidence,
  }
}
