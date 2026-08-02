import { test } from '@japa/runner'
import { ListRequests } from '#application/requests/list-requests.use-case'
import { GetRequest } from '#application/requests/get-request.use-case'
import { CancelRequest } from '#application/requests/cancel-request.use-case'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import { Result } from '#domain/shared/result'
import { InMemoryMediaRequestRepository, FixedClock, FakeMediaProvisioning } from './fakes.js'
import { InMemoryEventBus } from '#application/shared/event-bus'

const OWNER = { id: 'user-1', isAdmin: false }
const SOMEONE_ELSE = { id: 'user-2', isAdmin: false }
const ADMIN = { id: 'user-2', isAdmin: true }

function anExternalId(value = '550') {
  const result = ExternalId.create('tmdb', value)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aRequest(
  overrides: { id?: string; kind?: 'movie' | 'series' | 'album'; requestedBy?: string } = {},
) {
  return MediaRequest.request(
    overrides.id ?? '1',
    {
      requestedBy: overrides.requestedBy ?? 'user-1',
      kind: overrides.kind ?? 'movie',
      externalId: anExternalId(overrides.id ?? '550'),
      title: 'Fight Club',
      instanceId: 'instance-1',
    },
    new Date(),
  )
}

function cancelUseCase(
  repository: InMemoryMediaRequestRepository,
  provisioning = new FakeMediaProvisioning(),
) {
  return new CancelRequest(repository, new FixedClock(), provisioning, new InMemoryEventBus())
}

test.group('ListRequests', () => {
  test('filters by requestedBy', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))
    await repository.save(aRequest({ id: '2', requestedBy: 'user-2' }))

    const result = await new ListRequests(repository).execute({ requestedBy: 'user-1' })

    assert.lengthOf(result, 1)
  })
})

test.group('GetRequest', () => {
  test('returns not_found for an unknown id', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()

    const result = await new GetRequest(repository).execute({ id: 'unknown', actor: OWNER })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'not_found')
  })

  test('returns the request to its owner', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))

    const result = await new GetRequest(repository).execute({ id: '1', actor: OWNER })

    assert.isTrue(result.ok)
  })

  test('refuses to expose another user request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))

    const result = await new GetRequest(repository).execute({ id: '1', actor: SOMEONE_ELSE })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'forbidden')
  })

  test('lets an admin read anyone request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))

    const result = await new GetRequest(repository).execute({ id: '1', actor: ADMIN })

    assert.isTrue(result.ok)
  })
})

test.group('CancelRequest', () => {
  test('returns not_found for an unknown id', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()

    const result = await cancelUseCase(repository).execute({ id: 'unknown', actor: OWNER })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'not_found')
  })

  test('cancels a pending request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1' }))

    const result = await cancelUseCase(repository).execute({ id: '1', actor: OWNER })

    assert.isTrue(result.ok)
    const request = await repository.findById('1')
    assert.equal(request?.status, 'cancelled')
  })

  test('refuses to cancel another user request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))

    const result = await cancelUseCase(repository).execute({ id: '1', actor: SOMEONE_ELSE })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'forbidden')
    const untouched = await repository.findById('1')
    assert.equal(untouched?.status, 'pending')
  })

  test('lets an admin cancel anyone request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1', requestedBy: 'user-1' }))

    const result = await cancelUseCase(repository).execute({ id: '1', actor: ADMIN })

    assert.isTrue(result.ok)
    const cancelled = await repository.findById('1')
    assert.equal(cancelled?.status, 'cancelled')
  })

  test('tells the *arr to drop the download', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1' }))
    const provisioning = new FakeMediaProvisioning()

    await cancelUseCase(repository, provisioning).execute({ id: '1', actor: OWNER })

    assert.deepEqual(provisioning.cancelledRequestIds, ['1'])
  })

  test('still cancels locally when the *arr refuses, and reports why', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1' }))
    const provisioning = new FakeMediaProvisioning()
    provisioning.cancelResult = Result.err({
      type: 'instance_unavailable',
      message: 'Radarr is down',
    })

    const result = await cancelUseCase(repository, provisioning).execute({ id: '1', actor: OWNER })

    assert.isTrue(result.ok)
    assert.equal(result.ok ? result.value.provisioningError : undefined, 'Radarr is down')
    const stored = await repository.findById('1')
    assert.equal(stored?.status, 'cancelled')
  })

  test('refuses to cancel an importing request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = aRequest({ id: '1' })
    request.submit(ExternalRef.create('instance-1', 'remote-1'), new Date())
    const progress = RequestProgress.create({
      percentage: 10,
      sizeLeftBytes: 10,
      eta: null,
      stepLabel: '',
    })
    if (!progress.ok) throw new Error('unreachable')
    request.startDownloading(progress.value, new Date())
    request.startImporting(new Date())
    await repository.save(request)

    const result = await cancelUseCase(repository).execute({ id: '1', actor: OWNER })

    assert.isFalse(result.ok)
  })
})
