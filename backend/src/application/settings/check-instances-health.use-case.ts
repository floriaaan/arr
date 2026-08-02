import type { UseCase } from '#application/shared/use-case'
import type { EventBus } from '#application/shared/event-bus'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'

export interface HealthCheckSummary {
  checked: number
  /** Instances whose health flipped since the previous check — the only ones worth notifying about. */
  changed: number
}

/**
 * Re-checks every configured instance. Deliberately never *enables* anything:
 * `recordHealthCheck` disables on failure, but coming back up stays an
 * explicit admin action — a worker that silently re-enabled an instance
 * someone turned off on purpose would be a trap (cf.
 * docs/phase-6-fiabilite-requests/02, chantier 3 décision 3).
 */
export class CheckInstancesHealth implements UseCase<void, HealthCheckSummary> {
  constructor(
    private readonly repository: ServarrInstanceRepository,
    private readonly tester: ServarrConnectionTester,
    private readonly eventBus: EventBus,
  ) {}

  async execute(): Promise<HealthCheckSummary> {
    const instances = await this.repository.findAll()

    let changed = 0
    for (const instance of instances) {
      const wasHealthy = instance.lastHealthCheck?.healthy ?? null

      const result = await this.tester.test(instance.kind, instance.baseUrl, instance.apiKey)
      if (!result.ok) continue

      instance.recordHealthCheck(result.value)
      await this.repository.save(instance)

      // Publishing unconditionally would notify every 5 minutes for as long as
      // an instance stays down; only a transition is news.
      const events = instance.pullDomainEvents()
      if (wasHealthy !== result.value.healthy) {
        changed += 1
        await this.eventBus.publish(events)
      }
    }

    return { checked: instances.length, changed }
  }
}
