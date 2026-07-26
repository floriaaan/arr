import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'
import { Url } from './url.vo.js'
import { ApiKey } from './api-key.vo.js'

interface OidcConfigProps {
  issuerUrl: Url
  clientId: string
  clientSecret: ApiKey
  claimsMapping?: Record<string, string>
}

export interface OidcConfigInput {
  issuerUrl: string
  clientId: string
  clientSecret: string
  claimsMapping?: Record<string, string>
}

export class OidcConfig extends ValueObject<OidcConfigProps> {
  private constructor(props: OidcConfigProps) {
    super(props)
  }

  static create(input: OidcConfigInput): Result<OidcConfig, ValidationError> {
    const issuerUrl = Url.create(input.issuerUrl)
    if (!issuerUrl.ok) return issuerUrl

    if (input.clientId.trim().length === 0) {
      return Result.err({ field: 'clientId', message: 'Client ID must not be empty' })
    }

    const clientSecret = ApiKey.create(input.clientSecret)
    if (!clientSecret.ok) {
      return Result.err({ field: 'clientSecret', message: clientSecret.error.message })
    }

    return Result.ok(
      new OidcConfig({
        issuerUrl: issuerUrl.value,
        clientId: input.clientId,
        clientSecret: clientSecret.value,
        claimsMapping: input.claimsMapping,
      }),
    )
  }

  get issuerUrl(): Url {
    return this.props.issuerUrl
  }

  get clientId(): string {
    return this.props.clientId
  }

  get clientSecret(): ApiKey {
    return this.props.clientSecret
  }

  get claimsMapping(): Record<string, string> | undefined {
    return this.props.claimsMapping
  }
}
