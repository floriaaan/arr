import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '../servarr-kind.vo.js'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { HealthCheckResult } from '../health-check-result.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'

export interface ServarrConnectionTester {
  test(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<HealthCheckResult, ConnectionError>>
}
