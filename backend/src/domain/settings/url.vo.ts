import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface UrlProps {
  value: string
}

export class Url extends ValueObject<UrlProps> {
  private constructor(props: UrlProps) {
    super(props)
  }

  static create(raw: string): Result<Url, ValidationError> {
    let parsed: URL

    try {
      parsed = new URL(raw)
    } catch {
      return Result.err({ field: 'baseUrl', message: `"${raw}" is not a valid URL` })
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return Result.err({ field: 'baseUrl', message: 'Only http(s) URLs are allowed' })
    }

    return Result.ok(new Url({ value: raw.replace(/\/+$/, '') }))
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
