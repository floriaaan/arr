export type ServarrKind = 'radarr' | 'sonarr' | 'lidarr'

export interface ServarrInstanceDto {
  id: string
  kind: ServarrKind
  baseUrl: string
  hasApiKey: boolean
  rootFolderPath: string | null
  qualityProfileId: number | null
  metadataProfileId: number | null
  languageProfileId: number | null
  seriesType: string | null
  minimumAvailability: string | null
  enabled: boolean
  /** Health of the last check — `null` when the instance was never checked. */
  lastCheckedAt: string | null
  healthy: boolean | null
  detectedVersion: string | null
  lastError: { type: string; message: string } | null
}
