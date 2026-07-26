import type { Result } from '#domain/shared/result'
import type { Url } from '../url.vo.js'
import type { ApiKey } from '../api-key.vo.js'
import type { ConnectionError } from '../connection-error.vo.js'

export interface OidcDiscoveryInfo {
  authorizationEndpoint: string
  tokenEndpoint: string
  userinfoEndpoint: string
}

export interface OidcDiscovery {
  discover(
    issuerUrl: Url,
    clientId: string,
    clientSecret: ApiKey,
  ): Promise<Result<OidcDiscoveryInfo, ConnectionError>>
}
