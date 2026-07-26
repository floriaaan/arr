import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface MetadataProfileIdProps {
  value: number
}

/**
 * Lidarr-only. Kept as its own nominal type (rather than reusing
 * QualityProfileId) so a quality profile id can never be passed where a
 * metadata profile id is expected — caught at compile time.
 */
export class MetadataProfileId extends ValueObject<MetadataProfileIdProps> {
  private constructor(props: MetadataProfileIdProps) {
    super(props)
  }

  static create(raw: number): Result<MetadataProfileId, ValidationError> {
    if (!Number.isInteger(raw) || raw <= 0) {
      return Result.err({
        field: 'metadataProfileId',
        message: 'Metadata profile id must be a positive integer',
      })
    }
    return Result.ok(new MetadataProfileId({ value: raw }))
  }

  get value(): number {
    return this.props.value
  }
}
