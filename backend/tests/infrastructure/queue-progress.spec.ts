import { test } from '@japa/runner'
import { aggregateQueueProgress, toQueueProgress } from '#infrastructure/servarr/queue-progress'
import type { QueueRecordLike } from '#infrastructure/servarr/queue-progress'

function aRecord(overrides: Partial<QueueRecordLike> = {}): QueueRecordLike {
  return {
    status: 'downloading',
    trackedDownloadState: 'downloading',
    size: 1_000,
    sizeleft: 500,
    ...overrides,
  }
}

test.group('toQueueProgress (single record)', () => {
  test('maps a downloading record to a percentage', async ({ assert }) => {
    const { status, progress } = toQueueProgress(aRecord({ size: 1_000, sizeleft: 250 }))

    assert.equal(status, 'downloading')
    assert.equal(progress?.percentage, 75)
  })

  test('surfaces the error message of a failed record', async ({ assert }) => {
    const { status, failureReason } = toQueueProgress(
      aRecord({ trackedDownloadState: 'failed', errorMessage: 'No space left' }),
    )

    assert.equal(status, 'failed')
    assert.equal(failureReason, 'No space left')
  })
})

test.group('aggregateQueueProgress — all-or-nothing rule', () => {
  test('is inconclusive when nothing is queued', async ({ assert }) => {
    const { status } = aggregateQueueProgress([])

    assert.isNull(status)
  })

  test('fails as soon as one record fails, whatever the others do', async ({ assert }) => {
    const { status, failureReason } = aggregateQueueProgress([
      aRecord(),
      aRecord({ trackedDownloadState: 'failed', errorMessage: 'Import blocked' }),
      aRecord(),
    ])

    assert.equal(status, 'failed')
    assert.equal(failureReason, 'Import blocked')
  })

  test('sums the bytes across every record rather than reading one', async ({ assert }) => {
    // Two episodes: one at 100%, one untouched — 50% overall, not 0% or 100%.
    const { status, progress } = aggregateQueueProgress([
      aRecord({ size: 1_000, sizeleft: 0 }),
      aRecord({ size: 1_000, sizeleft: 1_000 }),
    ])

    assert.equal(status, 'downloading')
    assert.equal(progress?.percentage, 50)
    assert.equal(progress?.sizeLeftBytes, 1_000)
  })

  test('never reports available, even when every record is imported', async ({ assert }) => {
    // The queue being empty of a series says nothing about episodes that were
    // never queued — the file counts decide, not this.
    const { status } = aggregateQueueProgress([
      aRecord({ trackedDownloadState: 'imported' }),
      aRecord({ trackedDownloadState: 'imported' }),
    ])

    assert.isNull(status)
  })

  test('reports importing as soon as one record is importing', async ({ assert }) => {
    const { status } = aggregateQueueProgress([
      aRecord({ trackedDownloadState: 'downloading' }),
      aRecord({ trackedDownloadState: 'importing' }),
    ])

    assert.equal(status, 'importing')
  })

  test('keeps the furthest eta — the series ends with its last episode', async ({ assert }) => {
    const { progress } = aggregateQueueProgress([
      aRecord({ estimatedCompletionTime: '2026-01-01T10:00:00Z' }),
      aRecord({ estimatedCompletionTime: '2026-01-01T12:00:00Z' }),
    ])

    assert.equal(progress?.eta?.toISOString(), '2026-01-01T12:00:00.000Z')
  })

  test('a failure wins over an in-progress import', async ({ assert }) => {
    const { status } = aggregateQueueProgress([
      aRecord({ trackedDownloadState: 'importing' }),
      aRecord({ trackedDownloadState: 'failedPending', errorMessage: 'Bad release' }),
    ])

    assert.equal(status, 'failed')
  })
})
