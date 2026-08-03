import { test } from '@japa/runner'
import { InMemoryEventBus } from '#application/shared/event-bus'
import { ReconcileProgress } from '#application/requests/reconcile-progress.use-case'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import { InMemoryMediaRequestRepository, FakeDownloadProgress, FixedClock } from './fakes.js'

function anExternalId() {
  const result = ExternalId.create('tmdb', '550')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aSubmittedRequest() {
  const request = MediaRequest.request(
    '1',
    {
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: anExternalId(),
      title: 'Fight Club',
      instanceId: 'instance-1',
      origin: 'manual',
      requiresApproval: false,
    },
    new Date(),
  )
  request.submit(ExternalRef.create('instance-1', 'remote-1'), new Date())
  return request
}

function aProgress(percentage: number) {
  const result = RequestProgress.create({
    percentage,
    sizeLeftBytes: 100,
    eta: null,
    stepLabel: 'Downloading',
  })
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('ReconcileProgress', () => {
  test('moves a submitted request to downloading when the snapshot reports downloading', async ({
    assert,
  }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aSubmittedRequest()
    await repository.save(request)

    const downloadProgress = new FakeDownloadProgress()
    downloadProgress.snapshots = [
      {
        ref: ExternalRef.create('instance-1', 'remote-1'),
        status: 'downloading',
        progress: aProgress(20),
      },
    ]

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    const updated = await repository.findById('1')
    assert.equal(updated?.status, 'downloading')
    assert.equal(updated?.progress?.percentage, 20)
  })

  test('completes a request once the snapshot reports available while importing', async ({
    assert,
  }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aSubmittedRequest()
    request.startDownloading(aProgress(10), new Date())
    request.startImporting(new Date())
    await repository.save(request)

    const downloadProgress = new FakeDownloadProgress()
    downloadProgress.snapshots = [
      { ref: ExternalRef.create('instance-1', 'remote-1'), status: 'available' },
    ]

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    const updated = await repository.findById('1')
    assert.equal(updated?.status, 'available')
  })

  test('fast-forwards a submitted request straight to available when a poll misses the intermediate stages', async ({
    assert,
  }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aSubmittedRequest()
    await repository.save(request)

    const downloadProgress = new FakeDownloadProgress()
    downloadProgress.snapshots = [
      { ref: ExternalRef.create('instance-1', 'remote-1'), status: 'available' },
    ]

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    const updated = await repository.findById('1')
    assert.equal(updated?.status, 'available')
  })

  test('fails a request when the snapshot reports a failure', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aSubmittedRequest()
    await repository.save(request)

    const downloadProgress = new FakeDownloadProgress()
    downloadProgress.snapshots = [
      {
        ref: ExternalRef.create('instance-1', 'remote-1'),
        status: 'failed',
        failureReason: 'disk full',
      },
    ]

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    const updated = await repository.findById('1')
    assert.equal(updated?.status, 'failed')
    assert.equal(updated?.failureReason, 'disk full')
  })

  test('ignores a snapshot for a ref that does not match any tracked request', async ({
    assert,
  }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aSubmittedRequest()
    await repository.save(request)

    const downloadProgress = new FakeDownloadProgress()
    downloadProgress.snapshots = [
      { ref: ExternalRef.create('instance-2', 'other-remote'), status: 'available' },
    ]

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    const updated = await repository.findById('1')
    assert.equal(updated?.status, 'submitted')
  })

  test('does nothing when there are no active requests', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const downloadProgress = new FakeDownloadProgress()

    await new ReconcileProgress(
      repository,
      downloadProgress,
      new FixedClock(),
      new InMemoryEventBus(),
    ).execute()

    assert.isTrue(true)
  })
})
