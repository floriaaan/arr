import type { UseCase } from '#application/shared/use-case'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings.vo'

export class GetEffectiveAuthSettings implements UseCase<void, EffectiveAuthSettings> {
  constructor(private readonly provider: AuthSettingsProvider) {}

  async execute(): Promise<EffectiveAuthSettings> {
    return this.provider.resolveEffective()
  }
}
