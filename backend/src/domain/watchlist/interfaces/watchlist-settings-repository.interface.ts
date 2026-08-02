import type { WatchlistSettings } from '../watchlist-settings.aggregate.js'

export interface WatchlistSettingsRepository {
  get(): Promise<WatchlistSettings>
  save(settings: WatchlistSettings): Promise<void>
}
