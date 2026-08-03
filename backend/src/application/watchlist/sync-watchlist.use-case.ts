import type { UseCase } from '#application/shared/use-case'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { WatchlistProviderResolver } from '#domain/watchlist/interfaces/watchlist-provider-resolver.interface'
import type { WatchlistSeenItemsRepository } from '#domain/watchlist/interfaces/watchlist-seen-items-repository.interface'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { Clock } from '#domain/shared/clock.interface'
import type { CreateRequest } from '#application/requests/create-request.use-case'

export interface SyncWatchlistAccountError {
  accountId: string
  message: string
}

export interface SyncWatchlistSummary {
  accountsProcessed: number
  itemsSeen: number
  requestsCreated: number
  errors: SyncWatchlistAccountError[]
}

const EMPTY_SUMMARY: SyncWatchlistSummary = {
  accountsProcessed: 0,
  itemsSeen: 0,
  requestsCreated: 0,
  errors: [],
}

/**
 * One run: every watchlist-enabled account, every not-yet-seen item, gated
 * by the same approval policy as a manual request (via `CreateRequest`,
 * `origin: 'watchlist'`). Capped per account per run — `maxNewRequestsPerRun`
 * — so a freshly linked account with a 300-title backlog doesn't flood the
 * queue in one pass; the rest is picked up on the following runs since
 * unprocessed items are never marked seen (cf. docs/phase-7-watchlist-sync,
 * chantier 5 décision 4 et chantier 6).
 */
export class SyncWatchlist implements UseCase<void, SyncWatchlistSummary> {
  constructor(
    private readonly accounts: UserMediaAccountRepository,
    private readonly providers: WatchlistProviderResolver,
    private readonly seenItems: WatchlistSeenItemsRepository,
    private readonly settingsRepo: WatchlistSettingsRepository,
    private readonly users: UserDirectory,
    private readonly createRequest: CreateRequest,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<SyncWatchlistSummary> {
    const settings = await this.settingsRepo.get()
    if (!settings.enabled) return EMPTY_SUMMARY

    const accounts = await this.accounts.findAllWatchlistEnabled()
    const summary: SyncWatchlistSummary = {
      accountsProcessed: 0,
      itemsSeen: 0,
      requestsCreated: 0,
      errors: [],
    }

    for (const account of accounts) {
      summary.accountsProcessed += 1
      const now = this.clock.now()

      try {
        const user = await this.users.findById(account.userId)
        const isAdmin = user?.role === 'admin'
        const items = await this.providers.resolve(account.kind).fetchItems(account)
        let createdThisAccount = 0

        for (const item of items) {
          if (createdThisAccount >= settings.maxNewRequestsPerRun) break
          if (await this.seenItems.hasSeen(account.id, item.externalId)) continue
          summary.itemsSeen += 1

          const result = await this.createRequest.execute({
            requestedBy: account.userId,
            isAdmin,
            kind: item.kind,
            externalId: { scheme: item.externalId.scheme, value: item.externalId.value },
            origin: 'watchlist',
          })

          // No active instance is a config problem, not this item's fault —
          // stop this account's items rather than repeat the same failure
          // for the rest of the list, and don't mark the item seen so it's
          // retried once an admin configures an instance.
          if (!result.ok && result.error === 'no_active_instance') {
            throw new Error(`No active instance configured for ${item.kind} requests`)
          }

          const mediaRequestId = result.ok ? result.value.id : null
          await this.seenItems.markSeen(account.id, item.externalId, mediaRequestId, now)
          if (result.ok) {
            createdThisAccount += 1
            summary.requestsCreated += 1
          }
        }

        account.recordSyncSuccess(now)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        account.recordSyncFailure(message, now)
        summary.errors.push({ accountId: account.id, message })
      }

      await this.accounts.save(account)
    }

    return summary
  }
}
