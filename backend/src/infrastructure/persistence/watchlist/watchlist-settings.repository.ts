import WatchlistSettingsLucidModel from './watchlist_settings.lucid.js'
import { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'

/** Singleton row — the fixed id is the whole enforcement mechanism (cf. `notification-settings.repository.ts`). */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000004'

export class LucidWatchlistSettingsRepository implements WatchlistSettingsRepository {
  async get(): Promise<WatchlistSettings> {
    const row = await WatchlistSettingsLucidModel.find(SINGLETON_ID)
    if (!row) return WatchlistSettings.create(SINGLETON_ID)

    return WatchlistSettings.reconstruct(SINGLETON_ID, {
      enabled: row.enabled,
      intervalMinutes: row.intervalMinutes,
      maxNewRequestsPerRun: row.maxNewRequestsPerRun,
    })
  }

  async save(settings: WatchlistSettings): Promise<void> {
    const model =
      (await WatchlistSettingsLucidModel.find(SINGLETON_ID)) ?? new WatchlistSettingsLucidModel()
    model.id = SINGLETON_ID
    model.enabled = settings.enabled
    model.intervalMinutes = settings.intervalMinutes
    model.maxNewRequestsPerRun = settings.maxNewRequestsPerRun
    await model.save()
  }
}
