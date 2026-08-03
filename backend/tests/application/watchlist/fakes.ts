import { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'
import type { WatchlistProviderResolver } from '#domain/watchlist/interfaces/watchlist-provider-resolver.interface'
import type { WatchlistProvider } from '#domain/watchlist/interfaces/watchlist-provider.interface'
import type { WatchlistItem } from '#domain/watchlist/watchlist-item.vo'
import type { WatchlistSeenItemsRepository } from '#domain/watchlist/interfaces/watchlist-seen-items-repository.interface'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { Email } from '#domain/identity/email.vo'
import type { User } from '#domain/identity/user.entity'

export class InMemoryUserMediaAccountRepository implements UserMediaAccountRepository {
  private byId = new Map<string, UserMediaAccount>()

  async findById(id: string): Promise<UserMediaAccount | null> {
    return this.byId.get(id) ?? null
  }

  async findByUserAndKind(userId: string, kind: MediaServerKind): Promise<UserMediaAccount | null> {
    return [...this.byId.values()].find((a) => a.userId === userId && a.kind === kind) ?? null
  }

  async findByUser(userId: string): Promise<UserMediaAccount[]> {
    return [...this.byId.values()].filter((a) => a.userId === userId)
  }

  async findAllWatchlistEnabled(): Promise<UserMediaAccount[]> {
    return [...this.byId.values()].filter((a) => a.watchlistEnabled)
  }

  async findAll(): Promise<UserMediaAccount[]> {
    return [...this.byId.values()]
  }

  async save(account: UserMediaAccount): Promise<void> {
    this.byId.set(account.id, account)
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id)
  }
}

export class FakeWatchlistProvider implements WatchlistProvider {
  items: WatchlistItem[] = []
  error: Error | null = null

  async fetchItems(_account: UserMediaAccount): Promise<WatchlistItem[]> {
    if (this.error) throw this.error
    return this.items
  }
}

export class FakeWatchlistProviderResolver implements WatchlistProviderResolver {
  readonly provider = new FakeWatchlistProvider()

  resolve(_kind: MediaServerKind): WatchlistProvider {
    return this.provider
  }
}

export class InMemoryWatchlistSeenItemsRepository implements WatchlistSeenItemsRepository {
  private seen = new Map<string, { mediaRequestId: string | null; firstSeenAt: Date }>()

  private key(accountId: string, externalId: ExternalId): string {
    return `${accountId}:${externalId.scheme}:${externalId.value}`
  }

  async hasSeen(accountId: string, externalId: ExternalId): Promise<boolean> {
    return this.seen.has(this.key(accountId, externalId))
  }

  async markSeen(
    accountId: string,
    externalId: ExternalId,
    mediaRequestId: string | null,
    now: Date,
  ): Promise<void> {
    this.seen.set(this.key(accountId, externalId), { mediaRequestId, firstSeenAt: now })
  }
}

export class InMemoryWatchlistSettingsRepository implements WatchlistSettingsRepository {
  private settings = WatchlistSettings.create('settings-1')

  async get(): Promise<WatchlistSettings> {
    return this.settings
  }

  async save(settings: WatchlistSettings): Promise<void> {
    this.settings = settings
  }
}

export class FakeUserDirectory implements UserDirectory {
  adminUserIds = new Set<string>()

  async findById(id: string): Promise<User | null> {
    const { User: UserEntity } = await import('#domain/identity/user.entity')
    const { Email: EmailVo } = await import('#domain/identity/email.vo')
    const email = EmailVo.create(`${id}@example.test`)
    if (!email.ok) throw new Error('unreachable')
    return UserEntity.create(id, {
      email: email.value,
      role: this.adminUserIds.has(id) ? 'admin' : 'user',
      createdAt: new Date(),
    })
  }

  async findByEmail(_email: Email): Promise<User | null> {
    return null
  }

  async existsAny(): Promise<boolean> {
    return true
  }
}
