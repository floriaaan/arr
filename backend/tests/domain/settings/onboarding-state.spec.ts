import { test } from '@japa/runner'
import { OnboardingState } from '#domain/settings/onboarding-state.aggregate'

test.group('OnboardingState', () => {
  test('starts as not_started', ({ assert }) => {
    assert.equal(OnboardingState.start('1').status, 'not_started')
  })

  test('markAdminCreated() moves to admin_created', ({ assert }) => {
    const state = OnboardingState.start('1')
    const result = state.markAdminCreated(new Date())

    assert.isTrue(result.ok)
    assert.equal(state.status, 'admin_created')
  })

  test('markAdminCreated() is refused once already past not_started', ({ assert }) => {
    const state = OnboardingState.start('1')
    state.markAdminCreated(new Date())

    const result = state.markAdminCreated(new Date())

    assert.isFalse(result.ok)
  })

  test('markServicesConfigured() is refused before an admin exists', ({ assert }) => {
    const state = OnboardingState.start('1')
    const result = state.markServicesConfigured(new Date())
    assert.isFalse(result.ok)
  })

  test('complete() is refused before services are configured', ({ assert }) => {
    const state = OnboardingState.start('1')
    state.markAdminCreated(new Date())

    const result = state.complete(new Date(), true)
    assert.isFalse(result.ok)
  })

  test('complete() is refused when no *arr instance is active', ({ assert }) => {
    const state = OnboardingState.start('1')
    state.markAdminCreated(new Date())
    state.markServicesConfigured(new Date())

    const result = state.complete(new Date(), false)

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'no_active_instance')
  })

  test('complete() succeeds once services are configured and an instance is active', ({
    assert,
  }) => {
    const state = OnboardingState.start('1')
    state.markAdminCreated(new Date())
    state.markServicesConfigured(new Date())

    const result = state.complete(new Date(), true)

    assert.isTrue(result.ok)
    assert.equal(state.status, 'completed')
  })

  test('complete() emits OnboardingCompleted on success', ({ assert }) => {
    const state = OnboardingState.start('1')
    state.markAdminCreated(new Date())
    state.markServicesConfigured(new Date())
    state.complete(new Date(), true)

    const events = state.pullDomainEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0]?.name, 'OnboardingCompleted')
  })
})
