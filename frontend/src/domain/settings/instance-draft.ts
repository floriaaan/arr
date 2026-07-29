export interface InstanceDraft {
  baseUrl: string
  apiKey: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  seriesType?: string
  minimumAvailability?: string
  enabled: boolean
}
