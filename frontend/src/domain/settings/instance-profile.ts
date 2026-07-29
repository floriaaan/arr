import type { QualityProfileItem } from './quality-profile-record'

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
  /**
   * Pushed straight to the *arr as the real Quality Profile — a profile and
   * a Quality Profile are the same thing. Passthrough-typed like
   * `QualityProfileRecord`: round-trips whatever extra fields (formatItems,
   * language…) the *arr's schema/existing profile carried.
   */
  qualityProfile: Record<string, unknown> & {
    upgradeAllowed: boolean
    cutoff: number
    items: QualityProfileItem[]
  }
  metadataProfileId?: number
  languageProfileId?: number
  seriesType?: string
  minimumAvailability?: string
  setAsDefault?: boolean
}
