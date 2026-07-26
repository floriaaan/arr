import { test } from '@japa/runner'
import { CreateRequest } from '#application/requests/create-request.use-case'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { Result } from '#domain/shared/result'
import {
  FakeMediaLookup,
  InMemoryServarrInstanceRepository,
  InMemoryMediaRequestRepository,
  FakeMediaProvisioning,
  SequentialIdGenerator,
  FixedClock,
} from './fakes.js'

function anExternalId() {
  const result = ExternalId.create('tmdb', '550')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aMediaDetail(overrides: { alreadyManaged?: boolean } = {}) {
  return MediaDetail.create(anExternalId(), {
    kind: 'movie',
    title: 'Fight Club',
    year: 1999,
    overview: '',
    posterRef: null,
    alreadyManaged: overrides.alreadyManaged ?? false,
    genres: [],
  })
}

async function anActiveRadarrInstance(repository: InMemoryServarrInstanceRepository) {
  const baseUrl = Url.create('http://radarr.local')
  const apiKey = ApiKey.create('abc')
  const rootFolderPath = RootFolderPath.create('/data/movies')
  const qualityProfileId = QualityProfileId.create(1)
  if (!baseUrl.ok || !apiKey.ok || !rootFolderPath.ok || !qualityProfileId.ok)
    throw new Error('unreachable')

  const instance = ServarrInstance.draft('instance-1', 'radarr', baseUrl.value, apiKey.value)
  instance.configure(rootFolderPath.value, qualityProfileId.value, null, null)
  instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))
  instance.enable()
  await repository.save(instance)
  return instance
}

function setup() {
  const requestRepository = new InMemoryMediaRequestRepository()
  const provisioning = new FakeMediaProvisioning()
  const lookup = new FakeMediaLookup()
  const instanceRepository = new InMemoryServarrInstanceRepository()
  const useCase = new CreateRequest(
    requestRepository,
    provisioning,
    lookup,
    instanceRepository,
    new SequentialIdGenerator(),
    new FixedClock(),
  )
  return { requestRepository, provisioning, lookup, instanceRepository, useCase }
}

test.group('CreateRequest', () => {
  test('refuses a media already managed by *arr', async ({ assert }) => {
    const { lookup, instanceRepository, useCase } = setup()
    lookup.detailResult = aMediaDetail({ alreadyManaged: true })
    await anActiveRadarrInstance(instanceRepository)

    const result = await useCase.execute({
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'already_managed')
  })

  test('refuses when there is no active instance for the kind', async ({ assert }) => {
    const { lookup, useCase } = setup()
    lookup.detailResult = aMediaDetail()

    const result = await useCase.execute({
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'no_active_instance')
  })

  test('refuses a duplicate active request for the same media', async ({ assert }) => {
    const { lookup, instanceRepository, provisioning, useCase } = setup()
    lookup.detailResult = aMediaDetail()
    await anActiveRadarrInstance(instanceRepository)
    provisioning.nextResult = Result.ok(ExternalRef.create('instance-1', 'remote-1'))

    await useCase.execute({
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })
    const result = await useCase.execute({
      requestedBy: 'user-2',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'already_requested')
  })

  test('submits and persists the request on success', async ({ assert }) => {
    const { lookup, instanceRepository, provisioning, requestRepository, useCase } = setup()
    lookup.detailResult = aMediaDetail()
    await anActiveRadarrInstance(instanceRepository)
    provisioning.nextResult = Result.ok(ExternalRef.create('instance-1', 'remote-1'))

    const result = await useCase.execute({
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })

    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.status, 'submitted')
      assert.equal(result.value.title, 'Fight Club')
    }
    assert.isNotNull(await requestRepository.findById('id-1'))
  })

  test('persists a failed request when provisioning fails', async ({ assert }) => {
    const { lookup, instanceRepository, provisioning, requestRepository, useCase } = setup()
    lookup.detailResult = aMediaDetail()
    await anActiveRadarrInstance(instanceRepository)
    provisioning.nextResult = Result.err({
      type: 'instance_unavailable',
      message: 'Radarr is down',
    })

    const result = await useCase.execute({
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: { scheme: 'tmdb', value: '550' },
    })

    assert.isFalse(result.ok)
    const persisted = await requestRepository.findById('id-1')
    assert.equal(persisted?.status, 'failed')
    assert.equal(persisted?.failureReason, 'Radarr is down')
  })
})
