import type { UseCase } from '#application/shared/use-case'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'
import type { RequestApprovalSettings } from '#domain/requests/request-approval-settings.aggregate'

export class GetRequestApprovalSettings implements UseCase<void, RequestApprovalSettings> {
  constructor(private readonly repository: RequestApprovalSettingsRepository) {}

  async execute(): Promise<RequestApprovalSettings> {
    return this.repository.get()
  }
}
