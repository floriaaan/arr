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
}
