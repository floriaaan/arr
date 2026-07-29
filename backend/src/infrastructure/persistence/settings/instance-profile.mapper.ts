import type InstanceProfileLucidModel from './instance_profile.lucid.js'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'
import type { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'

function okOrThrow<T>(result: Result<T, ValidationError>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

export function toDomain(row: InstanceProfileLucidModel): InstanceProfile {
  return InstanceProfile.reconstruct(row.id, {
    instanceId: row.instanceId,
    name: row.name,
    rootFolderPath: okOrThrow(RootFolderPath.create(row.rootFolderPath)),
    qualityProfileId: okOrThrow(QualityProfileId.create(row.qualityProfileId)),
    metadataProfileId: row.metadataProfileId
      ? okOrThrow(MetadataProfileId.create(row.metadataProfileId))
      : null,
    languageProfileId: row.languageProfileId
      ? okOrThrow(LanguageProfileId.create(row.languageProfileId))
      : null,
    isDefault: row.isDefault,
  })
}

export function applyToModel(profile: InstanceProfile, model: InstanceProfileLucidModel): void {
  model.id = profile.id
  model.instanceId = profile.instanceId
  model.name = profile.name
  model.rootFolderPath = profile.rootFolderPath.value
  model.qualityProfileId = profile.qualityProfileId.value
  model.metadataProfileId = profile.metadataProfileId?.value ?? null
  model.languageProfileId = profile.languageProfileId?.value ?? null
  model.isDefault = profile.isDefault
}
