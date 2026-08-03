import type { ApplicationService } from '@adonisjs/core/types'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'
import type { WatchlistSeenItemsRepository } from '#domain/watchlist/interfaces/watchlist-seen-items-repository.interface'
import type { WatchlistProviderRegistry } from '#infrastructure/watchlist/watchlist-provider-registry'

export default class WatchlistProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('watchlist.accountRepository', async () => {
      const { LucidUserMediaAccountRepository } =
        await import('#infrastructure/persistence/watchlist/user-media-account.repository')
      return new LucidUserMediaAccountRepository()
    })

    this.app.container.singleton('watchlist.settingsRepository', async () => {
      const { LucidWatchlistSettingsRepository } =
        await import('#infrastructure/persistence/watchlist/watchlist-settings.repository')
      return new LucidWatchlistSettingsRepository()
    })

    this.app.container.singleton('watchlist.seenItemsRepository', async () => {
      const { LucidWatchlistSeenItemsRepository } =
        await import('#infrastructure/persistence/watchlist/watchlist-seen-items.repository')
      return new LucidWatchlistSeenItemsRepository()
    })

    this.app.container.singleton('watchlist.providerRegistry', async () => {
      const { WatchlistProviderRegistry } =
        await import('#infrastructure/watchlist/watchlist-provider-registry')
      return new WatchlistProviderRegistry()
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'watchlist.accountRepository': UserMediaAccountRepository
    'watchlist.settingsRepository': WatchlistSettingsRepository
    'watchlist.seenItemsRepository': WatchlistSeenItemsRepository
    'watchlist.providerRegistry': WatchlistProviderRegistry
  }
}
