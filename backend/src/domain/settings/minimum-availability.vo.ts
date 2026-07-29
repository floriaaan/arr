import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

export type MinimumAvailabilityValue = 'announced' | 'inCinemas' | 'released' | 'preDB'

const MINIMUM_AVAILABILITIES: readonly MinimumAvailabilityValue[] = [
  'announced',
  'inCinemas',
  'released',
  'preDB',
]

interface MinimumAvailabilityProps {
  value: MinimumAvailabilityValue
}

/** Radarr-only. How far along a movie's release must be before it's grabbed. */
export class MinimumAvailability extends ValueObject<MinimumAvailabilityProps> {
  private constructor(props: MinimumAvailabilityProps) {
    super(props)
  }

  static create(raw: string): Result<MinimumAvailability, ValidationError> {
    if (!MINIMUM_AVAILABILITIES.includes(raw as MinimumAvailabilityValue)) {
      return Result.err({
        field: 'minimumAvailability',
        message: `Minimum availability must be one of: ${MINIMUM_AVAILABILITIES.join(', ')}`,
      })
    }
    return Result.ok(new MinimumAvailability({ value: raw as MinimumAvailabilityValue }))
  }

  get value(): MinimumAvailabilityValue {
    return this.props.value
  }
}
