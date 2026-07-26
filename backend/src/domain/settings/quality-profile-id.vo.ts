import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface QualityProfileIdProps {
  value: number
}

export class QualityProfileId extends ValueObject<QualityProfileIdProps> {
  private constructor(props: QualityProfileIdProps) {
    super(props)
  }

  static create(raw: number): Result<QualityProfileId, ValidationError> {
    if (!Number.isInteger(raw) || raw <= 0) {
      return Result.err({
        field: 'qualityProfileId',
        message: 'Quality profile id must be a positive integer',
      })
    }
    return Result.ok(new QualityProfileId({ value: raw }))
  }

  get value(): number {
    return this.props.value
  }
}
