import { AggregateRoot } from '#domain/shared/aggregate-root'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export interface UserMediaAccountProps {
  userId: string
  kind: MediaServerKind
  externalUserId: string
  username: string
  /** Plain in the domain, encrypted at rest — same treatment as `ApiKey` (cf. `ServarrInstance`). */
  accessToken: string
  /** Unused for Plex (its watchlist is a cloud endpoint); required for Jellyfin/Emby, self-hosted. */
  baseUrl: string | null
  watchlistEnabled: boolean
  lastSyncedAt: Date | null
  lastSyncError: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LinkMediaAccountInput {
  userId: string
  kind: MediaServerKind
  externalUserId: string
  username: string
  accessToken: string
  baseUrl: string | null
}

/**
 * One Plex/Jellyfin/Emby account linked by a user to their own account, for
 * watchlist sync (cf. docs/phase-7-watchlist-sync, chantier 2). Distinct
 * from `MediaServer` — that one is an admin-configured link-out with no
 * credentials at all.
 */
export class UserMediaAccount extends AggregateRoot<string> {
  private props: UserMediaAccountProps

  private constructor(id: string, props: UserMediaAccountProps) {
    super(id)
    this.props = props
  }

  static link(id: string, input: LinkMediaAccountInput, now: Date): UserMediaAccount {
    return new UserMediaAccount(id, {
      ...input,
      watchlistEnabled: true,
      lastSyncedAt: null,
      lastSyncError: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstruct(id: string, props: UserMediaAccountProps): UserMediaAccount {
    return new UserMediaAccount(id, props)
  }

  get userId(): string {
    return this.props.userId
  }

  get kind(): MediaServerKind {
    return this.props.kind
  }

  get externalUserId(): string {
    return this.props.externalUserId
  }

  get username(): string {
    return this.props.username
  }

  get accessToken(): string {
    return this.props.accessToken
  }

  get baseUrl(): string | null {
    return this.props.baseUrl
  }

  get watchlistEnabled(): boolean {
    return this.props.watchlistEnabled
  }

  get lastSyncedAt(): Date | null {
    return this.props.lastSyncedAt
  }

  get lastSyncError(): string | null {
    return this.props.lastSyncError
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  setWatchlistEnabled(enabled: boolean, now: Date): void {
    this.props.watchlistEnabled = enabled
    this.props.updatedAt = now
  }

  /** Refreshing the token (e.g. after a 401) without re-running the whole link flow. */
  updateAccessToken(accessToken: string, now: Date): void {
    this.props.accessToken = accessToken
    this.props.updatedAt = now
  }

  recordSyncSuccess(now: Date): void {
    this.props.lastSyncedAt = now
    this.props.lastSyncError = null
    this.props.updatedAt = now
  }

  recordSyncFailure(reason: string, now: Date): void {
    this.props.lastSyncError = reason
    this.props.updatedAt = now
  }
}
