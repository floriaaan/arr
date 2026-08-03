export type MediaAccountKind = 'plex' | 'jellyfin' | 'emby'

export interface UserMediaAccountDto {
  id: string
  kind: MediaAccountKind
  username: string
  baseUrl: string | null
  watchlistEnabled: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
  createdAt: string
}

export interface UserMediaAccountAdminDto extends UserMediaAccountDto {
  user: { id: string; email: string | null }
}

export interface PlexPin {
  id: number
  code: string
  clientIdentifier: string
}

export interface PlexLinkStart {
  pin: PlexPin
  authUrl: string
}

export type PlexLinkResult =
  | { status: 'pending' }
  | { status: 'linked'; account: UserMediaAccountDto }
