import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

interface RequestProgressProps {
  percentage: number
  sizeLeftBytes: number
  eta: Date | null
  stepLabel: string
}

export type RequestProgressInput = RequestProgressProps

export class RequestProgress extends ValueObject<RequestProgressProps> {
  private constructor(props: RequestProgressProps) {
    super(props)
  }

  static create(input: RequestProgressInput): Result<RequestProgress, ValidationError> {
    if (input.percentage < 0 || input.percentage > 100) {
      return Result.err({ field: 'percentage', message: 'Percentage must be between 0 and 100' })
    }
    if (input.sizeLeftBytes < 0) {
      return Result.err({ field: 'sizeLeftBytes', message: 'Size left must not be negative' })
    }
    return Result.ok(new RequestProgress(input))
  }

  get percentage(): number {
    return this.props.percentage
  }

  get sizeLeftBytes(): number {
    return this.props.sizeLeftBytes
  }

  get eta(): Date | null {
    return this.props.eta
  }

  get stepLabel(): string {
    return this.props.stepLabel
  }
}
