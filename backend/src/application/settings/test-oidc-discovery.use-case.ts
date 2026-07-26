import type { UseCase } from '#application/shared/use-case'
import type {
  OidcDiscovery,
  OidcDiscoveryInfo,
} from '#domain/settings/interfaces/oidc-discovery.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import type { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'

export interface TestOidcDiscoveryInput {
  issuerUrl: string
  clientId: string
  clientSecret: string
}

export type TestOidcDiscoveryError = ConnectionError | ValidationError

export class TestOidcDiscovery implements UseCase<
  TestOidcDiscoveryInput,
  Result<OidcDiscoveryInfo, TestOidcDiscoveryError>
> {
  constructor(private readonly discovery: OidcDiscovery) {}

  async execute(
    input: TestOidcDiscoveryInput,
  ): Promise<Result<OidcDiscoveryInfo, TestOidcDiscoveryError>> {
    const issuerUrl = Url.create(input.issuerUrl)
    if (!issuerUrl.ok) return issuerUrl

    const clientSecret = ApiKey.create(input.clientSecret)
    if (!clientSecret.ok) return clientSecret

    return this.discovery.discover(issuerUrl.value, input.clientId, clientSecret.value)
  }
}
