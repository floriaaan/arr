import type { ApplicationService } from '@adonisjs/core/types'
import type { Clock } from '#domain/shared/clock.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { EventBus } from '#application/shared/event-bus'

/**
 * `Clock`/`IdGenerator` are stateless, dependency-free — this binding exists
 * only so presentation controllers can get to them without importing
 * `src/infrastructure/*` directly, which the dependency-cruiser boundary
 * rules forbid (providers/ sits outside src/, so it's the sanctioned place
 * to wire infrastructure to a port).
 */
export default class SharedProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('shared.clock', async () => {
      const { SystemClock } = await import('#infrastructure/shared/system-clock')
      return new SystemClock()
    })

    this.app.container.singleton('shared.idGenerator', async () => {
      const { UuidIdGenerator } = await import('#infrastructure/shared/uuid-id-generator')
      return new UuidIdGenerator()
    })

    /**
     * A singleton on purpose: subscribers register once at boot, so every use
     * case must publish onto that same instance (cf.
     * docs/phase-6-fiabilite-requests/02, chantier 1).
     */
    this.app.container.singleton('shared.eventBus', async () => {
      const { InMemoryEventBus } = await import('#application/shared/event-bus')
      return new InMemoryEventBus()
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'shared.clock': Clock
    'shared.idGenerator': IdGenerator
    'shared.eventBus': EventBus
  }
}
