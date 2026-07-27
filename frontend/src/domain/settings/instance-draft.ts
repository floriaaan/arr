export interface InstanceDraft {
  baseUrl: string
  apiKey: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  enabled: boolean
}
