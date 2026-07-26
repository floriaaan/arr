import { test } from '@japa/runner'
import { AggregateRoot } from '#domain/shared/aggregate-root'
import type { DomainEvent } from '#domain/shared/domain-event'

class Counter extends AggregateRoot<string> {
  private value = 0

  constructor(id: string) {
    super(id)
  }

  increment(now: Date): void {
    this.value += 1
    this.record({ name: 'CounterIncremented', occurredAt: now, payload: { value: this.value } })
  }
}

test.group('AggregateRoot', () => {
  test('records events until they are pulled', ({ assert }) => {
    const counter = new Counter('1')
    const now = new Date('2026-01-01T00:00:00Z')

    counter.increment(now)
    counter.increment(now)

    const events: DomainEvent[] = counter.pullDomainEvents()
    assert.lengthOf(events, 2)
    assert.equal(events[0]?.name, 'CounterIncremented')
  })

  test('pulling events clears the pending list', ({ assert }) => {
    const counter = new Counter('1')
    counter.increment(new Date())

    counter.pullDomainEvents()

    assert.lengthOf(counter.pullDomainEvents(), 0)
  })
})
