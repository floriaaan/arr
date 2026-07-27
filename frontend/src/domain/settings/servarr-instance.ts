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
  enabled: boolean
}
