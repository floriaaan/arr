import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { SyncWatchlist } from '#application/watchlist/sync-watchlist.use-case'
import { CreateRequest } from '#application/requests/create-request.use-case'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Long-running process, its own service in compose.yml — same shape as
 * `requests:reconcile` (cf. docs/adr/0003-reconciliation-progression.md).
 * Unlike that job, the interval is DB-backed and user-facing (cf.
 * docs/phase-7-watchlist-sync, chantier 5 décision 2): re-read at the start
 * of every iteration, no hot-reload mid-run.
 */
export default class WatchlistSync extends BaseCommand {
  static commandName = 'watchlist:sync'
  static description = 'Sync linked Plex/Jellyfin/Emby watchlists into requests'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const accountRepository = await this.app.container.make('watchlist.accountRepository')
    const providerRegistry = await this.app.container.make('watchlist.providerRegistry')
    const settingsRepository = await this.app.container.make('watchlist.settingsRepository')
    const seenItemsRepository = await this.app.container.make('watchlist.seenItemsRepository')
    const userDirectory = await this.app.container.make('identity.userDirectory')

    const requestRepository = await this.app.container.make('requests.repository')
    const provisioning = await this.app.container.make('requests.provisioning')
    const lookup = await this.app.container.make('catalog.mediaLookup')
    const instanceRepository = await this.app.container.make('settings.instanceRepository')
    const approvalSettings = await this.app.container.make('requests.approvalSettingsRepository')
    const userPreferences = await this.app.container.make('requests.userPreferencesRepository')
    const idGenerator = await this.app.container.make('shared.idGenerator')
    const clock = await this.app.container.make('shared.clock')
    const eventBus = await this.app.container.make('shared.eventBus')

    const createRequest = new CreateRequest(
      requestRepository,
      provisioning,
      lookup,
      instanceRepository,
      approvalSettings,
      userPreferences,
      idGenerator,
      clock,
      eventBus,
    )
    const sync = new SyncWatchlist(
      accountRepository,
      providerRegistry,
      seenItemsRepository,
      settingsRepository,
      userDirectory,
      createRequest,
      clock,
    )

    this.logger.info('watchlist:sync started')

    let stopped = false
    this.app.terminating(async () => {
      stopped = true
    })

    while (!stopped) {
      const settings = await settingsRepository.get()

      if (!settings.enabled) {
        this.logger.info('watchlist:sync disabled in settings — checking again in 5 min')
        await sleep(5 * 60_000)
        continue
      }

      try {
        const summary = await sync.execute()
        this.logger.info(
          `watchlist:sync processed ${summary.accountsProcessed} account(s), ` +
            `${summary.itemsSeen} new item(s), ${summary.requestsCreated} request(s) created` +
            (summary.errors.length > 0 ? `, ${summary.errors.length} account error(s)` : ''),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`watchlist:sync iteration failed: ${message}`)
      }

      await sleep(settings.intervalMinutes * 60_000)
    }
  }
}
