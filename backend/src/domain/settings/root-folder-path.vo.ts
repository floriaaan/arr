import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface RootFolderPathProps {
  value: string
}

export class RootFolderPath extends ValueObject<RootFolderPathProps> {
  private constructor(props: RootFolderPathProps) {
    super(props)
  }

  static create(raw: string): Result<RootFolderPath, ValidationError> {
    if (raw.trim().length === 0) {
      return Result.err({ field: 'rootFolderPath', message: 'Root folder path must not be empty' })
    }
    return Result.ok(new RootFolderPath({ value: raw }))
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
