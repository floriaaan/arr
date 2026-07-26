import { z } from 'zod'
import { BaseServarrClient } from './base-servarr-client.js'
import { apiPathPrefix, classifyConnectionError } from './errors.js'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'

const SystemStatusSchema = z.object({ version: z.string() })

export class HttpServarrConnectionTester implements ServarrConnectionTester {
  async test(
    kind: ServarrKind,
    baseUrl: Url,
    apiKey: ApiKey,
  ): Promise<Result<HealthCheckResult, ConnectionError>> {
    const client = new BaseServarrClient(baseUrl.value, apiKey.reveal())

    try {
      const raw = await client.request({ path: `${apiPathPrefix(kind)}/system/status` })
      const status = SystemStatusSchema.parse(raw)
      return Result.ok(HealthCheckResult.healthy(new Date(), status.version))
    } catch (error) {
      return Result.ok(HealthCheckResult.unhealthy(new Date(), classifyConnectionError(error)))
    }
  }
}
