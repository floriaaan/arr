import type { UseCase } from '#application/shared/use-case'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'
import type {
  ApprovalPolicy,
  RequestApprovalSettings,
} from '#domain/requests/request-approval-settings.aggregate'

export interface SaveRequestApprovalSettingsInput {
  moviePolicy: ApprovalPolicy
  seriesPolicy: ApprovalPolicy
  albumPolicy: ApprovalPolicy
}

/** Nothing here can fail validation — unlike `SaveNotificationSettings`, no `Result` wrapper. */
export class SaveRequestApprovalSettings implements UseCase<
  SaveRequestApprovalSettingsInput,
  RequestApprovalSettings
> {
  constructor(private readonly repository: RequestApprovalSettingsRepository) {}

  async execute(input: SaveRequestApprovalSettingsInput): Promise<RequestApprovalSettings> {
    const settings = await this.repository.get()
    settings.configure(input)
    await this.repository.save(settings)
    return settings
  }
}
