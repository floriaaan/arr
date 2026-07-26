import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface LanguageProfileIdProps {
  value: number
}

/** Sonarr-only. Kept as its own nominal type — same reasoning as MetadataProfileId. */
export class LanguageProfileId extends ValueObject<LanguageProfileIdProps> {
  private constructor(props: LanguageProfileIdProps) {
    super(props)
  }

  static create(raw: number): Result<LanguageProfileId, ValidationError> {
    if (!Number.isInteger(raw) || raw <= 0) {
      return Result.err({
        field: 'languageProfileId',
        message: 'Language profile id must be a positive integer',
      })
    }
    return Result.ok(new LanguageProfileId({ value: raw }))
  }

  get value(): number {
    return this.props.value
  }
}
