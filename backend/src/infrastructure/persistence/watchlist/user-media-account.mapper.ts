import { DateTime } from 'luxon'
import type UserMediaAccountLucidModel from './user_media_account.lucid.js'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'
import { encryptSecret, decryptSecret } from '#infrastructure/shared/encryption'

export function toDomain(row: UserMediaAccountLucidModel): UserMediaAccount {
  return UserMediaAccount.reconstruct(row.id, {
    userId: row.userId,
    kind: row.kind as MediaServerKind,
    externalUserId: row.externalUserId,
    username: row.username,
    accessToken: decryptSecret(row.accessTokenEncrypted),
    baseUrl: row.baseUrl,
    watchlistEnabled: row.watchlistEnabled,
    lastSyncedAt: row.lastSyncedAt?.toJSDate() ?? null,
    lastSyncError: row.lastSyncError,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  })
}

export function applyToModel(account: UserMediaAccount, model: UserMediaAccountLucidModel): void {
  model.id = account.id
  model.userId = account.userId
  model.kind = account.kind
  model.externalUserId = account.externalUserId
  model.username = account.username
  model.accessTokenEncrypted = encryptSecret(account.accessToken)
  model.baseUrl = account.baseUrl
  model.watchlistEnabled = account.watchlistEnabled
  model.lastSyncedAt = account.lastSyncedAt ? DateTime.fromJSDate(account.lastSyncedAt) : null
  model.lastSyncError = account.lastSyncError
}
