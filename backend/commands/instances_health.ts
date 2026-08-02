import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { CheckInstancesHealth } from '#application/settings/check-instances-health.use-case'
import { LucidServarrInstanceRepository } from '#infrastructure/persistence/settings/servarr-instance.repository'
import { HttpServarrConnectionTester } from '#infrastructure/servarr/connection-tester'

const POLL_INTERVAL_MS = 5 * 60_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Long-running process, same shape as `requests:reconcile` (cf.
 * docs/adr/0003 — an Ace loop rather than a scheduler dependency).
 * Before this, an instance was health-checked exactly once, when it was
 * saved, and never again.
 */
export default class InstancesHealth extends BaseCommand {
  static commandName = 'instances:health'
  static description = 'Periodically re-check every configured *arr instance and record its health'

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  async run() {
    const eventBus = await this.app.container.make('shared.eventBus')
    const check = new CheckInstancesHealth(
      new LucidServarrInstanceRepository(),
      new HttpServarrConnectionTester(),
      eventBus,
    )

    this.logger.info('instances:health started')

    let stopped = false
    this.app.terminating(async () => {
      stopped = true
    })

    while (!stopped) {
      try {
        const summary = await check.execute()
        if (summary.changed > 0) {
          this.logger.info(
            `instances:health checked ${summary.checked} instance(s), ${summary.changed} changed state`,
          )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`instances:health iteration failed: ${message}`)
      }

      await sleep(POLL_INTERVAL_MS)
    }
  }
}
