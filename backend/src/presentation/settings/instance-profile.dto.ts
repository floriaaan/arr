import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'

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

export function toInstanceProfileDto(profile: InstanceProfile): InstanceProfileDto {
  return {
    id: profile.id,
    instanceId: profile.instanceId,
    name: profile.name,
    rootFolderPath: profile.rootFolderPath.value,
    qualityProfileId: profile.qualityProfileId.value,
    metadataProfileId: profile.metadataProfileId?.value ?? null,
    languageProfileId: profile.languageProfileId?.value ?? null,
    seriesType: profile.seriesType?.value ?? null,
    minimumAvailability: profile.minimumAvailability?.value ?? null,
    isDefault: profile.isDefault,
  }
}
