import { test } from '@japa/runner'
import { ListRequests } from '#application/requests/list-requests.use-case'
import { GetRequest } from '#application/requests/get-request.use-case'
import { CancelRequest } from '#application/requests/cancel-request.use-case'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import { InMemoryMediaRequestRepository, FixedClock } from './fakes.js'

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
  test('returns null for an unknown id', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const result = await new GetRequest(repository).execute({ id: 'unknown' })
    assert.isNull(result)
  })
})

test.group('CancelRequest', () => {
  test('returns not_found for an unknown id', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const result = await new CancelRequest(repository, new FixedClock()).execute({ id: 'unknown' })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'not_found')
  })

  test('cancels a pending request', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aRequest({ id: '1' }))

    const result = await new CancelRequest(repository, new FixedClock()).execute({ id: '1' })

    assert.isTrue(result.ok)
    const request = await repository.findById('1')
    assert.equal(request?.status, 'cancelled')
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

    const result = await new CancelRequest(repository, new FixedClock()).execute({ id: '1' })

    assert.isFalse(result.ok)
  })
})
