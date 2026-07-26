import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

export type ExternalIdScheme = 'tmdb' | 'tvdb' | 'musicbrainz'

const SCHEMES: ExternalIdScheme[] = ['tmdb', 'tvdb', 'musicbrainz']

interface ExternalIdProps {
  scheme: ExternalIdScheme
  value: string
}

export class ExternalId extends ValueObject<ExternalIdProps> {
  private constructor(props: ExternalIdProps) {
    super(props)
  }

  static create(scheme: ExternalIdScheme, value: string): Result<ExternalId, ValidationError> {
    if (value.trim().length === 0) {
      return Result.err({ field: 'externalId', message: 'External id value must not be empty' })
    }
    return Result.ok(new ExternalId({ scheme, value }))
  }

  /** Parses the `"tmdb:550"` form used e.g. as a MediaRequest's denormalized id. */
  static parse(raw: string): Result<ExternalId, ValidationError> {
    const [scheme, value] = raw.split(':')
    if (!scheme || !value || !SCHEMES.includes(scheme as ExternalIdScheme)) {
      return Result.err({ field: 'externalId', message: `"${raw}" is not a valid external id` })
    }
    return ExternalId.create(scheme as ExternalIdScheme, value)
  }

  get scheme(): ExternalIdScheme {
    return this.props.scheme
  }

  get value(): string {
    return this.props.value
  }

  format(): string {
    return `${this.props.scheme}:${this.props.value}`
  }

  toString(): string {
    return this.format()
  }
}
