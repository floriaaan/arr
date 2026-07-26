import { z } from 'zod'
import type {
  OidcDiscovery,
  OidcDiscoveryInfo,
} from '#domain/settings/interfaces/oidc-discovery.interface'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

/** RFC-standard OIDC discovery document — no framework-specific guessing needed here. */
const DiscoveryDocumentSchema = z.object({
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  userinfo_endpoint: z.string(),
})

function classifyDiscoveryError(error: unknown): ConnectionError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { type: 'timeout', message: 'The issuer did not respond in time' }
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause
    if (cause?.code === 'ENOTFOUND' || cause?.code === 'EAI_AGAIN') {
      return { type: 'dns', message: error.message }
    }
    if (cause?.code === 'ECONNREFUSED') {
      return { type: 'connection_refused', message: error.message }
    }
    return { type: 'unexpected_response', message: error.message }
  }
  return { type: 'unexpected_response', message: String(error) }
}

/**
 * No better-auth dependency — this is a plain fetch against the issuer's
 * well-known discovery document (cf. docs/adr/0001, Phase 1 notes).
 * clientId/clientSecret aren't needed for discovery itself (an unauthenticated
 * endpoint per the OIDC spec); kept on the port signature for symmetry with
 * the other connection-test ports and in case a deeper check is added later.
 */
export class WellKnownOidcDiscovery implements OidcDiscovery {
  async discover(
    issuerUrl: Url,
    _clientId: string,
    _clientSecret: ApiKey,
  ): Promise<Result<OidcDiscoveryInfo, ConnectionError>> {
    const discoveryUrl = `${issuerUrl.value}/.well-known/openid-configuration`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(discoveryUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return Result.err({
          type: 'unexpected_response',
          message: `Discovery endpoint responded with HTTP ${response.status}`,
        })
      }

      const document = DiscoveryDocumentSchema.parse(await response.json())
      return Result.ok({
        authorizationEndpoint: document.authorization_endpoint,
        tokenEndpoint: document.token_endpoint,
        userinfoEndpoint: document.userinfo_endpoint,
      })
    } catch (error) {
      return Result.err(classifyDiscoveryError(error))
    } finally {
      clearTimeout(timeout)
    }
  }
}
