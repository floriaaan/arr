import { test } from '@japa/runner'
import { BootstrapInstancesFromEnv } from '#application/settings/bootstrap-instances-from-env.use-case'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Result } from '#domain/shared/result'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import {
  FakeServarrConnectionTester,
  FakeServarrProfileCatalog,
  InMemoryServarrInstanceRepository,
  InMemoryInstanceProfileRepository,
  InMemoryOnboardingStateRepository,
  SequentialIdGenerator,
  FixedClock,
} from './fakes.js'

function anEnvConfig() {
  return { kind: 'radarr' as const, baseUrl: 'http://radarr.local', apiKey: 'abc123' }
}

function makeUseCase() {
  const repository = new InMemoryServarrInstanceRepository()
  const tester = new FakeServarrConnectionTester()
  tester.nextResult = Result.ok(HealthCheckResult.healthy(new Date(), '5.14.0'))
  const catalog = new FakeServarrProfileCatalog()
  const instanceProfiles = new InMemoryInstanceProfileRepository()
  const onboardingState = new InMemoryOnboardingStateRepository()

  const useCase = new BootstrapInstancesFromEnv(
    repository,
    tester,
    catalog,
    new SequentialIdGenerator(),
    instanceProfiles,
    onboardingState,
    new FixedClock(),
  )

  return { useCase, repository, tester, catalog, onboardingState }
}

test.group('BootstrapInstancesFromEnv', () => {
  test('creates and enables an instance from env config', async ({ assert }) => {
    const { useCase, repository } = makeUseCase()

    const result = await useCase.execute([anEnvConfig()])

    assert.deepEqual(result.bootstrapped, ['radarr'])
    const saved = await repository.findByKind('radarr')
    assert.isTrue(saved?.enabled)
  })

  test('skips a kind that already has an instance, without touching it', async ({ assert }) => {
    const { useCase, repository } = makeUseCase()
    const baseUrl = Url.create('http://existing.local')
    const apiKey = ApiKey.create('existing-key')
    if (!baseUrl.ok || !apiKey.ok) throw new Error('unreachable')
    await repository.save(
      ServarrInstance.draft('existing-id', 'radarr', baseUrl.value, apiKey.value),
    )

    const result = await useCase.execute([anEnvConfig()])

    assert.deepEqual(result.skippedExisting, ['radarr'])
    assert.deepEqual(result.bootstrapped, [])
    const saved = await repository.findByKind('radarr')
    assert.equal(saved?.id, 'existing-id')
  })

  test('records a failure when the profile catalog cannot be reached, without throwing', async ({
    assert,
  }) => {
    const { useCase, catalog } = makeUseCase()
    catalog.rootFoldersResult = Result.err({ type: 'connection_refused', message: 'unreachable' })

    const result = await useCase.execute([anEnvConfig()])

    assert.deepEqual(result.bootstrapped, [])
    assert.lengthOf(result.failed, 1)
    assert.equal(result.failed[0]?.kind, 'radarr')
  })

  test('advances onboarding to services_configured once admin_created', async ({ assert }) => {
    const { useCase, onboardingState } = makeUseCase()
    const state = await onboardingState.get()
    state.markAdminCreated(new Date())
    await onboardingState.save(state)

    await useCase.execute([anEnvConfig()])

    const updated = await onboardingState.get()
    assert.equal(updated.status, 'services_configured')
  })

  test('does not touch onboarding state when nothing was bootstrapped', async ({ assert }) => {
    const { useCase, onboardingState } = makeUseCase()

    await useCase.execute([])

    const state = await onboardingState.get()
    assert.equal(state.status, 'not_started')
  })

  test('leaves onboarding state alone if the admin has not been created yet', async ({
    assert,
  }) => {
    const { useCase, onboardingState } = makeUseCase()

    await useCase.execute([anEnvConfig()])

    const state = await onboardingState.get()
    assert.equal(state.status, 'not_started')
  })
})
