import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'

export interface ServarrInstanceDto {
  id: string
  kind: string
  baseUrl: string
  hasApiKey: true
  rootFolderPath: string | null
  qualityProfileId: number | null
  metadataProfileId: number | null
  languageProfileId: number | null
  seriesType: string | null
  minimumAvailability: string | null
  enabled: boolean
  /**
   * The health columns have existed since the first migration but were never
   * serialized, so the UI could not tell "an admin disabled it" from "Radarr
   * has been unreachable for a week" (cf. docs/phase-6-fiabilite-requests/02,
   * chantier 3 décision 1).
   */
  lastCheckedAt: string | null
  healthy: boolean | null
  detectedVersion: string | null
  lastError: { type: string; message: string } | null
}

/** `apiKey` never travels in a response — only `hasApiKey: true` (cf. docs/phase-0/04-endpoints-http.md). */
export function toServarrInstanceDto(instance: ServarrInstance): ServarrInstanceDto {
  return {
    id: instance.id,
    kind: instance.kind,
    baseUrl: instance.baseUrl.value,
    hasApiKey: true,
    rootFolderPath: instance.rootFolderPath?.value ?? null,
    qualityProfileId: instance.qualityProfileId?.value ?? null,
    metadataProfileId: instance.metadataProfileId?.value ?? null,
    languageProfileId: instance.languageProfileId?.value ?? null,
    seriesType: instance.seriesType?.value ?? null,
    minimumAvailability: instance.minimumAvailability?.value ?? null,
    enabled: instance.enabled,
    lastCheckedAt: instance.lastHealthCheck?.checkedAt.toISOString() ?? null,
    healthy: instance.lastHealthCheck?.healthy ?? null,
    detectedVersion: instance.lastHealthCheck?.detectedVersion ?? null,
    lastError: instance.lastHealthCheck?.error ?? null,
  }
}
