import type { UseCase } from '#application/shared/use-case'
import type { AuthSettingsRepository } from '#domain/settings/interfaces/auth-settings-repository.interface'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { OidcConfig, type OidcConfigInput } from '#domain/settings/oidc-config.vo'

export interface SaveAuthSettingsInput {
  oidc: OidcConfigInput | null
}

export class SaveAuthSettings implements UseCase<
  SaveAuthSettingsInput,
  Result<void, ValidationError>
> {
  constructor(private readonly repository: AuthSettingsRepository) {}

  async execute(input: SaveAuthSettingsInput): Promise<Result<void, ValidationError>> {
    const settings = await this.repository.get()

    if (input.oidc === null) {
      settings.clearOidc()
    } else {
      const config = OidcConfig.create(input.oidc)
      if (!config.ok) return config
      settings.configureOidc(config.value)
    }

    await this.repository.save(settings)
    return Result.ok(undefined)
  }
}
