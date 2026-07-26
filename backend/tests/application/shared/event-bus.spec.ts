import { test } from '@japa/runner'
import { InMemoryEventBus } from '#application/shared/event-bus'
import type { DomainEvent } from '#domain/shared/domain-event'

test.group('InMemoryEventBus', () => {
  test('delivers published events to subscribers of the matching event name', async ({
    assert,
  }) => {
    const bus = new InMemoryEventBus()
    const received: DomainEvent[] = []
    bus.subscribe('Thing', (event) => {
      received.push(event)
    })

    await bus.publish([
      { name: 'Thing', occurredAt: new Date(), payload: { id: 1 } },
      { name: 'Other', occurredAt: new Date(), payload: { id: 2 } },
    ])

    assert.lengthOf(received, 1)
    assert.deepEqual(received[0]?.payload, { id: 1 })
  })

  test('does nothing when there is no subscriber for the event name', async ({ assert }) => {
    const bus = new InMemoryEventBus()
    await assert.doesNotReject(() =>
      bus.publish([{ name: 'Unheard', occurredAt: new Date(), payload: null }]),
    )
  })
})
