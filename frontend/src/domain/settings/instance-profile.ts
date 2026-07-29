export interface InstanceProfileDto {
  id: string
  instanceId: string
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId: number | null
  languageProfileId: number | null
  isDefault: boolean
}

export interface InstanceProfileDraft {
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId?: number
  languageProfileId?: number
  setAsDefault?: boolean
}
