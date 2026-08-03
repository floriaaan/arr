import UserRequestPreferencesLucidModel from './user_request_preferences.lucid.js'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'

export class LucidUserRequestPreferencesRepository implements UserRequestPreferencesRepository {
  async getAutoApprove(userId: string): Promise<boolean | null> {
    const row = await UserRequestPreferencesLucidModel.find(userId)
    return row?.autoApprove ?? null
  }

  async setAutoApprove(userId: string, autoApprove: boolean | null): Promise<void> {
    const model =
      (await UserRequestPreferencesLucidModel.find(userId)) ??
      new UserRequestPreferencesLucidModel()
    model.userId = userId
    model.autoApprove = autoApprove
    await model.save()
  }

  async listAll(): Promise<Record<string, boolean | null>> {
    const rows = await UserRequestPreferencesLucidModel.all()
    return Object.fromEntries(rows.map((row) => [row.userId, row.autoApprove]))
  }
}
