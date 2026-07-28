import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { ReconcileProgress } from '#application/requests/reconcile-progress.use-case'
import { LucidMediaRequestRepository } from '#infrastructure/persistence/requests/media-request.repository'
import { LucidServarrInstanceRepository } from '#infrastructure/persistence/settings/servarr-instance.repository'
import { ServarrRegistry } from '#infrastructure/servarr/servarr-registry'
import { ServarrDownloadProgress } from '#infrastructure/servarr/servarr-download-progress'
import { SystemClock } from '#infrastructure/shared/system-clock'

const ACTIVE_POLL_INTERVAL_MS = 10_000
const IDLE_POLL_INTERVAL_MS = 30_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Long-running process (its own container/service in compose.yml) — no
 * @adonisjs/queue dependency, cf. docs/adr/0003-reconciliation-progression.md.
 */
export default class RequestsReconcile extends BaseCommand {
  static commandName = 'requests:reconcile'
  static description =
    'Poll active *arr instances for download progress and update MediaRequest state'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const requestRepository = new LucidMediaRequestRepository()
    const instanceRepository = new LucidServarrInstanceRepository()
    const registry = new ServarrRegistry(instanceRepository)
    const downloadProgress = new ServarrDownloadProgress(registry)
    const reconcile = new ReconcileProgress(requestRepository, downloadProgress, new SystemClock())

    this.logger.info('requests:reconcile started')

    let stopped = false
    let wasIdle = false
    this.app.terminating(async () => {
      stopped = true
    })

    while (!stopped) {
      const activeRequests = await requestRepository.findActiveWithExternalRef()
      const activeCount = activeRequests.length

      if (activeCount === 0) {
        if (!wasIdle)
          this.logger.info('requests:reconcile idle — no active request, polling every 30s')
        wasIdle = true
        await sleep(IDLE_POLL_INTERVAL_MS)
        continue
      }
      wasIdle = false

      try {
        const summary = await reconcile.execute()
        this.logger.info(
          `requests:reconcile checked ${summary.checked} active request(s), updated ${summary.updated}`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`requests:reconcile iteration failed: ${message}`)
      }

      await sleep(ACTIVE_POLL_INTERVAL_MS)
    }
  }
}
