import { ValueObject } from '#domain/shared/value-object'
import type { OidcConfig } from './oidc-config.vo.js'

export type AuthSettingsSource = 'database' | 'environment' | 'disabled'

interface EffectiveAuthSettingsProps {
  passwordLoginEnabled: boolean
  oidc: OidcConfig | null
  oidcSource: AuthSettingsSource
}

export class EffectiveAuthSettings extends ValueObject<EffectiveAuthSettingsProps> {
  private constructor(props: EffectiveAuthSettingsProps) {
    super(props)
  }

  static create(props: EffectiveAuthSettingsProps): EffectiveAuthSettings {
    return new EffectiveAuthSettings(props)
  }

  get passwordLoginEnabled(): boolean {
    return this.props.passwordLoginEnabled
  }

  get oidc(): OidcConfig | null {
    return this.props.oidc
  }

  get oidcSource(): AuthSettingsSource {
    return this.props.oidcSource
  }
}
