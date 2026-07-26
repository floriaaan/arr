import type { DomainEvent } from '#domain/shared/domain-event'

export type EventHandler = (event: DomainEvent) => void | Promise<void>

export interface EventBus {
  publish(events: DomainEvent[]): Promise<void>
  subscribe(eventName: string, handler: EventHandler): void
}

/**
 * In-process, synchronous pub/sub — no persistence, no delivery guarantees.
 * Sufficient for the MVP (cf. docs/adr/0007-pas-de-event-store.md); swap this
 * class for an outbox-backed implementation later without touching use cases,
 * since they only ever depend on the `EventBus` interface above.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>()

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.name) ?? []
      for (const handler of handlers) {
        await handler(event)
      }
    }
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) ?? []
    handlers.push(handler)
    this.handlers.set(eventName, handlers)
  }
}
