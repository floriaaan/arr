import UserMediaAccountLucidModel from './user_media_account.lucid.js'
import { toDomain, applyToModel } from './user-media-account.mapper.js'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export class LucidUserMediaAccountRepository implements UserMediaAccountRepository {
  async findById(id: string): Promise<UserMediaAccount | null> {
    const row = await UserMediaAccountLucidModel.find(id)
    return row ? toDomain(row) : null
  }

  async findByUserAndKind(userId: string, kind: MediaServerKind): Promise<UserMediaAccount | null> {
    const row = await UserMediaAccountLucidModel.query()
      .where('userId', userId)
      .where('kind', kind)
      .first()
    return row ? toDomain(row) : null
  }

  async findByUser(userId: string): Promise<UserMediaAccount[]> {
    const rows = await UserMediaAccountLucidModel.query().where('userId', userId)
    return rows.map(toDomain)
  }

  async findAllWatchlistEnabled(): Promise<UserMediaAccount[]> {
    const rows = await UserMediaAccountLucidModel.query().where('watchlistEnabled', true)
    return rows.map(toDomain)
  }

  async findAll(): Promise<UserMediaAccount[]> {
    const rows = await UserMediaAccountLucidModel.all()
    return rows.map(toDomain)
  }

  async save(account: UserMediaAccount): Promise<void> {
    const model =
      (await UserMediaAccountLucidModel.find(account.id)) ?? new UserMediaAccountLucidModel()
    applyToModel(account, model)
    await model.save()
  }

  async delete(id: string): Promise<void> {
    const model = await UserMediaAccountLucidModel.find(id)
    if (model) await model.delete()
  }
}
