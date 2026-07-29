import { test } from '@japa/runner'
import { SaveInstance } from '#application/settings/save-instance.use-case'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Result } from '#domain/shared/result'
import {
  FakeServarrConnectionTester,
  InMemoryServarrInstanceRepository,
  InMemoryInstanceProfileRepository,
  SequentialIdGenerator,
} from './fakes.js'

function validInput(overrides: Partial<Parameters<SaveInstance['execute']>[0]> = {}) {
  return {
    kind: 'radarr' as const,
    baseUrl: 'http://radarr.local',
    apiKey: 'abc123',
    rootFolderPath: '/data/movies',
    qualityProfileId: 1,
    enabled: false,
    ...overrides,
  }
}

test.group('SaveInstance', () => {
  test('saves a disabled draft without testing the connection', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const tester = new FakeServarrConnectionTester()
    const useCase = new SaveInstance(
      repository,
      tester,
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput())

    assert.isTrue(result.ok)
    assert.isFalse(result.ok ? result.value.enabled : true)
  })

  test('rejects a metadata profile for a non-Lidarr instance', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const tester = new FakeServarrConnectionTester()
    const useCase = new SaveInstance(
      repository,
      tester,
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput({ metadataProfileId: 1 }))

    assert.isFalse(result.ok)
  })

  test('tests the connection and enables the instance when enabled is requested', async ({
    assert,
  }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const tester = new FakeServarrConnectionTester()
    tester.nextResult = Result.ok(HealthCheckResult.healthy(new Date(), '5.14.0'))
    const useCase = new SaveInstance(
      repository,
      tester,
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput({ enabled: true }))

    assert.isTrue(result.ok)
    assert.isTrue(result.ok ? result.value.enabled : false)
  })

  test('refuses to enable when the connection test fails', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const tester = new FakeServarrConnectionTester()
    tester.nextResult = Result.err({ type: 'unauthorized', message: 'invalid api key' })
    const useCase = new SaveInstance(
      repository,
      tester,
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput({ enabled: true }))

    assert.isFalse(result.ok)
  })

  test('updates the existing instance for a kind instead of creating a duplicate', async ({
    assert,
  }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const tester = new FakeServarrConnectionTester()
    const useCase = new SaveInstance(
      repository,
      tester,
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    await useCase.execute(validInput({ rootFolderPath: '/data/movies-v1' }))
    await useCase.execute(validInput({ rootFolderPath: '/data/movies-v2' }))

    const all = await repository.findAll()
    assert.lengthOf(all, 1)
    assert.equal(all[0]?.rootFolderPath?.value, '/data/movies-v2')
  })

  test('auto-creates a default "Default" profile on first configuration', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const useCase = new SaveInstance(
      repository,
      new FakeServarrConnectionTester(),
      new SequentialIdGenerator(),
      profiles,
    )

    const result = await useCase.execute(validInput())
    if (!result.ok) throw new Error('expected success')

    const created = await profiles.listByInstance(result.value.id)
    assert.lengthOf(created, 1)
    assert.equal(created[0]?.name, 'Default')
    assert.isTrue(created[0]?.isDefault)
  })

  test('does not create a second profile on a subsequent save', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const useCase = new SaveInstance(
      repository,
      new FakeServarrConnectionTester(),
      new SequentialIdGenerator(),
      profiles,
    )

    const first = await useCase.execute(validInput())
    if (!first.ok) throw new Error('expected success')
    await useCase.execute(validInput({ rootFolderPath: '/data/movies-v2' }))

    const all = await profiles.listByInstance(first.value.id)
    assert.lengthOf(all, 1)
  })

  test('accepts a minimum availability for a Radarr instance', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const useCase = new SaveInstance(
      repository,
      new FakeServarrConnectionTester(),
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput({ minimumAvailability: 'released' }))

    assert.isTrue(result.ok)
    assert.equal(result.ok ? result.value.minimumAvailability?.value : undefined, 'released')
  })

  test('rejects a series type for a non-Sonarr instance', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    const useCase = new SaveInstance(
      repository,
      new FakeServarrConnectionTester(),
      new SequentialIdGenerator(),
      new InMemoryInstanceProfileRepository(),
    )

    const result = await useCase.execute(validInput({ seriesType: 'anime' }))

    assert.isFalse(result.ok)
  })
})
