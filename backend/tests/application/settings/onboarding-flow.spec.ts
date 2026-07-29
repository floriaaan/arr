import { test } from '@japa/runner'
import { CreateAdminAccount } from '#application/settings/create-admin-account.use-case'
import { GetOnboardingState } from '#application/settings/get-onboarding-state.use-case'
import { MarkServicesConfigured } from '#application/settings/mark-services-configured.use-case'
import { CompleteOnboarding } from '#application/settings/complete-onboarding.use-case'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { Email } from '#domain/identity/email.vo'
import { User } from '#domain/identity/user.entity'
import {
  FakeUserDirectory,
  FakeAccountRegistrar,
  InMemoryOnboardingStateRepository,
  InMemoryServarrInstanceRepository,
  FixedClock,
} from './fakes.js'

test.group('CreateAdminAccount', () => {
  test('registers the account and marks the onboarding state as admin_created', async ({
    assert,
  }) => {
    const userDirectory = new FakeUserDirectory()
    const registrar = new FakeAccountRegistrar()
    const onboardingRepository = new InMemoryOnboardingStateRepository()
    const useCase = new CreateAdminAccount(
      userDirectory,
      registrar,
      onboardingRepository,
      new FixedClock(),
    )

    const result = await useCase.execute({ email: 'admin@example.com', password: 'super-secret' })

    assert.isTrue(result.ok)
    const state = await onboardingRepository.get()
    assert.equal(state.status, 'admin_created')
  })

  test('refuses when an admin already exists', async ({ assert }) => {
    const emailResult = Email.create('admin@example.com')
    if (!emailResult.ok) throw new Error('unreachable')

    const userDirectory = new FakeUserDirectory()
    userDirectory.users.push(
      User.create('1', { email: emailResult.value, role: 'admin', createdAt: new Date() }),
    )

    const useCase = new CreateAdminAccount(
      userDirectory,
      new FakeAccountRegistrar(),
      new InMemoryOnboardingStateRepository(),
      new FixedClock(),
    )

    const result = await useCase.execute({
      email: 'second-admin@example.com',
      password: 'super-secret',
    })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'admin_already_exists')
  })

  test('rejects a malformed email', async ({ assert }) => {
    const useCase = new CreateAdminAccount(
      new FakeUserDirectory(),
      new FakeAccountRegistrar(),
      new InMemoryOnboardingStateRepository(),
      new FixedClock(),
    )

    const result = await useCase.execute({ email: 'not-an-email', password: 'super-secret' })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'invalid_email')
  })
})

test.group('GetOnboardingState', () => {
  test('returns the repository state', async ({ assert }) => {
    const repository = new InMemoryOnboardingStateRepository()
    const state = await new GetOnboardingState(repository).execute()
    assert.equal(state.status, 'not_started')
  })
})

test.group('MarkServicesConfigured', () => {
  test('transitions admin_created -> services_configured', async ({ assert }) => {
    const repository = new InMemoryOnboardingStateRepository()
    const state = await repository.get()
    state.markAdminCreated(new Date())
    await repository.save(state)

    const result = await new MarkServicesConfigured(repository, new FixedClock()).execute()

    assert.isTrue(result.ok)
    const updated = await repository.get()
    assert.equal(updated.status, 'services_configured')
  })
})

function anActiveRadarrInstance(): ServarrInstance {
  const baseUrl = Url.create('http://radarr.local')
  const apiKey = ApiKey.create('abc')
  const rootFolderPath = RootFolderPath.create('/data/movies')
  const qualityProfileId = QualityProfileId.create(1)
  if (!baseUrl.ok || !apiKey.ok || !rootFolderPath.ok || !qualityProfileId.ok) {
    throw new Error('unreachable')
  }

  const instance = ServarrInstance.draft('1', 'radarr', baseUrl.value, apiKey.value)
  instance.configure(rootFolderPath.value, qualityProfileId.value, null, null, null, null)
  instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))
  instance.enable()
  return instance
}

test.group('CompleteOnboarding', () => {
  test('refuses completion when no instance is active', async ({ assert }) => {
    const onboardingRepository = new InMemoryOnboardingStateRepository()
    const state = await onboardingRepository.get()
    state.markAdminCreated(new Date())
    state.markServicesConfigured(new Date())
    await onboardingRepository.save(state)

    const useCase = new CompleteOnboarding(
      onboardingRepository,
      new InMemoryServarrInstanceRepository(),
      new FixedClock(),
    )

    const result = await useCase.execute()

    assert.isFalse(result.ok)
  })

  test('completes once an instance is active', async ({ assert }) => {
    const onboardingRepository = new InMemoryOnboardingStateRepository()
    const state = await onboardingRepository.get()
    state.markAdminCreated(new Date())
    state.markServicesConfigured(new Date())
    await onboardingRepository.save(state)

    const instanceRepository = new InMemoryServarrInstanceRepository()
    await instanceRepository.save(anActiveRadarrInstance())

    const useCase = new CompleteOnboarding(
      onboardingRepository,
      instanceRepository,
      new FixedClock(),
    )
    const result = await useCase.execute()

    assert.isTrue(result.ok)
    const finalState = await onboardingRepository.get()
    assert.equal(finalState.status, 'completed')
  })
})
