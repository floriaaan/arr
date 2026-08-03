import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { WatchlistSettingsRepository } from '#domain/watchlist/interfaces/watchlist-settings-repository.interface'
import type { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'
import type { ValidationError } from '#domain/shared/validation-error'

const MIN_INTERVAL_MINUTES = 15

export interface SaveWatchlistSettingsInput {
  enabled: boolean
  intervalMinutes: number
  maxNewRequestsPerRun: number
}

export class SaveWatchlistSettings implements UseCase<
  SaveWatchlistSettingsInput,
  Result<WatchlistSettings, ValidationError>
> {
  constructor(private readonly repository: WatchlistSettingsRepository) {}

  async execute(
    input: SaveWatchlistSettingsInput,
  ): Promise<Result<WatchlistSettings, ValidationError>> {
    // Floor at 15 min to avoid hammering Plex.tv/Jellyfin/Emby (cf. docs/phase-7-watchlist-sync, chantier 5 décision 2).
    if (input.intervalMinutes < MIN_INTERVAL_MINUTES) {
      return Result.err({
        field: 'intervalMinutes',
        message: `Interval must be at least ${MIN_INTERVAL_MINUTES} minutes.`,
      })
    }
    if (input.maxNewRequestsPerRun < 1) {
      return Result.err({
        field: 'maxNewRequestsPerRun',
        message: 'Must be at least 1.',
      })
    }

    const settings = await this.repository.get()
    settings.configure(input)
    await this.repository.save(settings)
    return Result.ok(settings)
  }
}
