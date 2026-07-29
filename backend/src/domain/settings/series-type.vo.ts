import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

export type SeriesTypeValue = 'standard' | 'daily' | 'anime'

const SERIES_TYPES: readonly SeriesTypeValue[] = ['standard', 'daily', 'anime']

interface SeriesTypeProps {
  value: SeriesTypeValue
}

/** Sonarr-only. Affects episode numbering/matching (standard/daily/anime). */
export class SeriesType extends ValueObject<SeriesTypeProps> {
  private constructor(props: SeriesTypeProps) {
    super(props)
  }

  static create(raw: string): Result<SeriesType, ValidationError> {
    if (!SERIES_TYPES.includes(raw as SeriesTypeValue)) {
      return Result.err({
        field: 'seriesType',
        message: `Series type must be one of: ${SERIES_TYPES.join(', ')}`,
      })
    }
    return Result.ok(new SeriesType({ value: raw as SeriesTypeValue }))
  }

  get value(): SeriesTypeValue {
    return this.props.value
  }
}
