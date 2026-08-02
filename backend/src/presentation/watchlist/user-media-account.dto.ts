import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'

export interface UserMediaAccountDto {
  id: string
  kind: 'plex' | 'jellyfin' | 'emby'
  username: string
  baseUrl: string | null
  watchlistEnabled: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
  createdAt: string
}

/** Never carries `accessToken` — the token is a credential, not something the client should ever see again. */
export function toUserMediaAccountDto(account: UserMediaAccount): UserMediaAccountDto {
  return {
    id: account.id,
    kind: account.kind,
    username: account.username,
    baseUrl: account.baseUrl,
    watchlistEnabled: account.watchlistEnabled,
    lastSyncedAt: account.lastSyncedAt ? account.lastSyncedAt.toISOString() : null,
    lastSyncError: account.lastSyncError,
    createdAt: account.createdAt.toISOString(),
  }
}

export interface UserMediaAccountAdminDto extends UserMediaAccountDto {
  user: { id: string; email: string | null }
}

/** Same shape, plus who it belongs to — for the admin diagnostics table (cf. chantier 7). */
export async function toUserMediaAccountAdminDto(
  account: UserMediaAccount,
  userDirectory: UserDirectory,
): Promise<UserMediaAccountAdminDto> {
  const user = await userDirectory.findById(account.userId)
  return {
    ...toUserMediaAccountDto(account),
    user: { id: account.userId, email: user?.email.value ?? null },
  }
}
