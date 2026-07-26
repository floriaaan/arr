import { ValueObject } from '#domain/shared/value-object'
import type { ConnectionError } from './connection-error.vo.js'

interface HealthCheckResultProps {
  checkedAt: Date
  healthy: boolean
  detectedVersion?: string
  error?: ConnectionError
}

export class HealthCheckResult extends ValueObject<HealthCheckResultProps> {
  private constructor(props: HealthCheckResultProps) {
    super(props)
  }

  static healthy(checkedAt: Date, detectedVersion: string): HealthCheckResult {
    return new HealthCheckResult({ checkedAt, healthy: true, detectedVersion })
  }

  static unhealthy(checkedAt: Date, error: ConnectionError): HealthCheckResult {
    return new HealthCheckResult({ checkedAt, healthy: false, error })
  }

  get checkedAt(): Date {
    return this.props.checkedAt
  }

  get healthy(): boolean {
    return this.props.healthy
  }

  get detectedVersion(): string | undefined {
    return this.props.detectedVersion
  }

  get error(): ConnectionError | undefined {
    return this.props.error
  }
}
