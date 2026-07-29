import type { ServarrKind } from './servarr-kind.vo.js'
import type { MetadataProfileId } from './metadata-profile-id.vo.js'
import type { LanguageProfileId } from './language-profile-id.vo.js'
import type { SeriesType } from './series-type.vo.js'
import type { MinimumAvailability } from './minimum-availability.vo.js'
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
  seriesType: SeriesType | null,
  minimumAvailability: MinimumAvailability | null,
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
  if (kind !== 'sonarr' && seriesType) {
    return Result.err({
      field: 'seriesType',
      message: 'Series type only applies to Sonarr instances',
    })
  }
  if (kind !== 'radarr' && minimumAvailability) {
    return Result.err({
      field: 'minimumAvailability',
      message: 'Minimum availability only applies to Radarr instances',
    })
  }

  return Result.ok(undefined)
}
