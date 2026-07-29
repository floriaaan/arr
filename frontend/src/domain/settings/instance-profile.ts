export interface InstanceProfileDto {
  id: string
  instanceId: string
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId: number | null
  languageProfileId: number | null
  seriesType: string | null
  minimumAvailability: string | null
  isDefault: boolean
}

export interface InstanceProfileDraft {
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  seriesType?: string
  minimumAvailability?: string
  setAsDefault?: boolean
}
