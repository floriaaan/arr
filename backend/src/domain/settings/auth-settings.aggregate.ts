import { AggregateRoot } from '#domain/shared/aggregate-root'
import type { OidcConfig } from './oidc-config.vo.js'

export interface AuthSettingsProps {
  oidc: OidcConfig | null
}

/**
 * Singleton aggregate (one row ever, enforced by the repository, not here).
 * Deliberately has no "password login enabled" flag: that policy is always
 * resolved by AuthSettingsProvider (env override precedence), never stored
 * here, so no code path can lock out the admin account.
 */
export class AuthSettings extends AggregateRoot<string> {
  private props: AuthSettingsProps

  private constructor(id: string, props: AuthSettingsProps) {
    super(id)
    this.props = props
  }

  static create(id: string): AuthSettings {
    return new AuthSettings(id, { oidc: null })
  }

  static reconstruct(id: string, props: AuthSettingsProps): AuthSettings {
    return new AuthSettings(id, props)
  }

  get oidc(): OidcConfig | null {
    return this.props.oidc
  }

  configureOidc(config: OidcConfig): void {
    this.props.oidc = config
  }

  clearOidc(): void {
    this.props.oidc = null
  }
}
