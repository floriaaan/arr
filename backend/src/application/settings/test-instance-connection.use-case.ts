import type { UseCase } from '#application/shared/use-case'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import type { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'

export interface TestInstanceConnectionInput {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
}

export type TestInstanceConnectionError = ConnectionError | ValidationError

export class TestInstanceConnection implements UseCase<
  TestInstanceConnectionInput,
  Result<HealthCheckResult, TestInstanceConnectionError>
> {
  constructor(private readonly tester: ServarrConnectionTester) {}

  async execute(
    input: TestInstanceConnectionInput,
  ): Promise<Result<HealthCheckResult, TestInstanceConnectionError>> {
    const baseUrl = Url.create(input.baseUrl)
    if (!baseUrl.ok) return baseUrl

    const apiKey = ApiKey.create(input.apiKey)
    if (!apiKey.ok) return apiKey

    return this.tester.test(input.kind, baseUrl.value, apiKey.value)
  }
}
