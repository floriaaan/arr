import type { UseCase } from '#application/shared/use-case'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'
import type { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'

export class GetWatchlistSettings implements UseCase<void, WatchlistSettings> {
  constructor(private readonly repository: WatchlistSettingsRepository) {}

  async execute(): Promise<WatchlistSettings> {
    return this.repository.get()
  }
}
