import RequestApprovalSettingsLucidModel from './request_approval_settings.lucid.js'
import { RequestApprovalSettings } from '#domain/requests/request-approval-settings.aggregate'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'

/** Singleton row — the fixed id is the whole enforcement mechanism (cf. `notification-settings.repository.ts`). */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000003'

export class LucidRequestApprovalSettingsRepository implements RequestApprovalSettingsRepository {
  async get(): Promise<RequestApprovalSettings> {
    const row = await RequestApprovalSettingsLucidModel.find(SINGLETON_ID)
    if (!row) return RequestApprovalSettings.create(SINGLETON_ID)

    return RequestApprovalSettings.reconstruct(SINGLETON_ID, {
      moviePolicy: row.moviePolicy,
      seriesPolicy: row.seriesPolicy,
      albumPolicy: row.albumPolicy,
    })
  }

  async save(settings: RequestApprovalSettings): Promise<void> {
    const model =
      (await RequestApprovalSettingsLucidModel.find(SINGLETON_ID)) ??
      new RequestApprovalSettingsLucidModel()
    model.id = SINGLETON_ID
    model.moviePolicy = settings.moviePolicy
    model.seriesPolicy = settings.seriesPolicy
    model.albumPolicy = settings.albumPolicy
    await model.save()
  }
}
