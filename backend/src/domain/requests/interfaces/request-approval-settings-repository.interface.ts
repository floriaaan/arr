import type { RequestApprovalSettings } from '../request-approval-settings.aggregate.js'

export interface RequestApprovalSettingsRepository {
  get(): Promise<RequestApprovalSettings>
  save(settings: RequestApprovalSettings): Promise<void>
}
