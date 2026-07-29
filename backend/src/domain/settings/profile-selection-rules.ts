import type { ServarrKind } from './servarr-kind.vo.js'
import type { MetadataProfileId } from './metadata-profile-id.vo.js'
import type { LanguageProfileId } from './language-profile-id.vo.js'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'

/**
 * Shared between `ServarrInstance.configure()` and `InstanceProfile` — a
 * profile's field-presence rules are the same regardless of whether it's
 * the instance's inline default or a named preset in `instance_profiles`.
 */
export function validateProfileSelection(
  kind: ServarrKind,
  metadataProfileId: MetadataProfileId | null,
  languageProfileId: LanguageProfileId | null,
): Result<void, ValidationError> {
  if (kind === 'lidarr' && !metadataProfileId) {
    return Result.err({
      field: 'metadataProfileId',
      message: 'Lidarr instances require a metadata profile',
    })
  }
  if (kind !== 'lidarr' && metadataProfileId) {
    return Result.err({
      field: 'metadataProfileId',
      message: 'Metadata profile only applies to Lidarr instances',
    })
  }
  if (kind !== 'sonarr' && languageProfileId) {
    return Result.err({
      field: 'languageProfileId',
      message: 'Language profile only applies to Sonarr instances',
    })
  }

  return Result.ok(undefined)
}
