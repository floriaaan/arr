import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface ApiKeyProps {
  value: string
}

/**
 * Opaque wrapper around a *arr API key. `toString()`/`equals()`'s JSON
 * serialization deliberately never expose the raw value — use `reveal()`
 * from infrastructure code only, right before it's sent over the wire.
 */
export class ApiKey extends ValueObject<ApiKeyProps> {
  private constructor(props: ApiKeyProps) {
    super(props)
  }

  static create(raw: string): Result<ApiKey, ValidationError> {
    if (raw.trim().length === 0) {
      return Result.err({ field: 'apiKey', message: 'API key must not be empty' })
    }
    return Result.ok(new ApiKey({ value: raw }))
  }

  reveal(): string {
    return this.props.value
  }

  toString(): string {
    return '••••••••'
  }

  toJSON(): string {
    return this.toString()
  }
}
