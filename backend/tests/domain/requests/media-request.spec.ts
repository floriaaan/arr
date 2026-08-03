import { test } from '@japa/runner'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'

function anExternalId() {
  const result = ExternalId.create('tmdb', '550')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aRequest(overrides: { origin?: 'manual' | 'watchlist'; requiresApproval?: boolean } = {}) {
  return MediaRequest.request(
    '1',
    {
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: anExternalId(),
      title: 'Fight Club',
      instanceId: 'instance-1',
      origin: overrides.origin ?? 'manual',
      requiresApproval: overrides.requiresApproval ?? false,
    },
    new Date('2026-01-01T00:00:00Z'),
  )
}

function aRef() {
  return ExternalRef.create('instance-1', 'remote-1')
}

function someProgress() {
  const result = RequestProgress.create({
    percentage: 10,
    sizeLeftBytes: 1000,
    eta: null,
    stepLabel: 'Downloading',
  })
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('MediaRequest — factory', () => {
  test('request() starts pending and emits MediaRequested', ({ assert }) => {
    const request = aRequest()

    assert.equal(request.status, 'pending')
    const events = request.pullDomainEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0]?.name, 'MediaRequested')
  })

  test('request() also emits RequestPendingApproval when it requires approval', ({ assert }) => {
    const request = aRequest({ requiresApproval: true })

    const events = request.pullDomainEvents()
    assert.lengthOf(events, 2)
    assert.equal(events[1]?.name, 'RequestPendingApproval')
  })
})

test.group('MediaRequest — happy path', () => {
  test('pending -> submitted -> downloading -> importing -> available', ({ assert }) => {
    const request = aRequest()
    const now = new Date()

    assert.isTrue(request.submit(aRef(), now).ok)
    assert.equal(request.status, 'submitted')

    assert.isTrue(request.startDownloading(someProgress(), now).ok)
    assert.equal(request.status, 'downloading')

    assert.isTrue(request.startImporting(now).ok)
    assert.equal(request.status, 'importing')

    assert.isTrue(request.complete(now).ok)
    assert.equal(request.status, 'available')
  })

  test('updateProgress() only changes the progress value while downloading', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())

    const laterProgress = RequestProgress.create({
      percentage: 80,
      sizeLeftBytes: 10,
      eta: null,
      stepLabel: 'Downloading',
    })
    if (!laterProgress.ok) throw new Error('unreachable')

    const result = request.updateProgress(laterProgress.value, new Date())

    assert.isTrue(result.ok)
    assert.equal(request.status, 'downloading')
    assert.equal(request.progress?.percentage, 80)
  })
})

test.group('MediaRequest — guarded transitions', () => {
  test('submit() is refused once already submitted', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())

    const result = request.submit(aRef(), new Date())

    assert.isFalse(result.ok)
  })

  test('startDownloading() is refused before submit()', ({ assert }) => {
    const request = aRequest()
    const result = request.startDownloading(someProgress(), new Date())
    assert.isFalse(result.ok)
  })

  test('updateProgress() is refused before startDownloading()', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())

    const result = request.updateProgress(someProgress(), new Date())

    assert.isFalse(result.ok)
  })

  test('startImporting() is refused before downloading', ({ assert }) => {
    const request = aRequest()
    const result = request.startImporting(new Date())
    assert.isFalse(result.ok)
  })

  test('complete() is refused before importing', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())

    const result = request.complete(new Date())

    assert.isFalse(result.ok)
  })
})

test.group('MediaRequest — fail()', () => {
  const setups: { name: string; arrange: (r: MediaRequest) => MediaRequest }[] = [
    { name: 'pending', arrange: (r) => r },
    {
      name: 'submitted',
      arrange: (r) => {
        r.submit(aRef(), new Date())
        return r
      },
    },
    {
      name: 'downloading',
      arrange: (r) => {
        r.submit(aRef(), new Date())
        r.startDownloading(someProgress(), new Date())
        return r
      },
    },
  ]

  for (const setup of setups) {
    test(`fail() succeeds from ${setup.name}`, ({ assert }) => {
      const request = setup.arrange(aRequest())
      const result = request.fail('boom', new Date())

      assert.isTrue(result.ok)
      assert.equal(request.status, 'failed')
      assert.equal(request.failureReason, 'boom')
    })
  }

  test('fail() is refused once already available', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())
    request.startImporting(new Date())
    request.complete(new Date())

    const result = request.fail('too late', new Date())

    assert.isFalse(result.ok)
  })

  test('fail() emits RequestFailed', ({ assert }) => {
    const request = aRequest()
    request.pullDomainEvents()

    request.fail('boom', new Date())

    const events = request.pullDomainEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0]?.name, 'RequestFailed')
  })
})

test.group('MediaRequest — cancel()', () => {
  test('cancel() succeeds from pending', ({ assert }) => {
    const request = aRequest()
    const result = request.cancel(new Date())

    assert.isTrue(result.ok)
    assert.equal(request.status, 'cancelled')
  })

  test('cancel() succeeds from downloading', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())

    const result = request.cancel(new Date())

    assert.isTrue(result.ok)
  })

  test('cancel() is refused once importing', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())
    request.startImporting(new Date())

    const result = request.cancel(new Date())

    assert.isFalse(result.ok)
  })

  test('cancel() is refused once available', ({ assert }) => {
    const request = aRequest()
    request.submit(aRef(), new Date())
    request.startDownloading(someProgress(), new Date())
    request.startImporting(new Date())
    request.complete(new Date())

    const result = request.cancel(new Date())

    assert.isFalse(result.ok)
  })
})

test.group('MediaRequest — approval gate', () => {
  test('submit() is refused while requiresApproval is true', ({ assert }) => {
    const request = aRequest({ requiresApproval: true })

    const result = request.submit(aRef(), new Date())

    assert.isFalse(result.ok)
    assert.equal(request.status, 'pending')
  })

  test('approve() lifts the gate without submitting', ({ assert }) => {
    const request = aRequest({ requiresApproval: true })

    const result = request.approve('admin-1', new Date())

    assert.isTrue(result.ok)
    assert.isFalse(request.requiresApproval)
    assert.equal(request.approvedByUserId, 'admin-1')
    assert.equal(request.status, 'pending')
  })

  test('submit() succeeds once approved', ({ assert }) => {
    const request = aRequest({ requiresApproval: true })
    request.approve('admin-1', new Date())

    const result = request.submit(aRef(), new Date())

    assert.isTrue(result.ok)
    assert.equal(request.status, 'submitted')
  })

  test('approve() is refused when no approval is pending', ({ assert }) => {
    const request = aRequest()

    const result = request.approve('admin-1', new Date())

    assert.isFalse(result.ok)
  })

  test('reject() cancels the request and records the reason', ({ assert }) => {
    const request = aRequest({ requiresApproval: true })

    const result = request.reject('Not interesting enough', new Date())

    assert.isTrue(result.ok)
    assert.equal(request.status, 'cancelled')
    assert.equal(request.rejectionReason, 'Not interesting enough')
    assert.isNotNull(request.rejectedAt)
  })

  test('reject() is refused when no approval is pending', ({ assert }) => {
    const request = aRequest()

    const result = request.reject('too late', new Date())

    assert.isFalse(result.ok)
  })
})
