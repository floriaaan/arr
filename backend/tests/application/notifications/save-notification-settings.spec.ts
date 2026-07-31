import { test } from '@japa/runner'
import { SaveNotificationSettings } from '#application/notifications/save-notification-settings.use-case'
import { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'

class InMemoryNotificationSettings implements NotificationSettingsRepository {
  private settings = NotificationSettings.create('id-1')

  async get(): Promise<NotificationSettings> {
    return this.settings
  }

  async save(settings: NotificationSettings): Promise<void> {
    this.settings = settings
  }
}

function baseInput() {
  return {
    authMode: 'none' as const,
    onRequestCreated: true,
    onRequestAvailable: true,
    onRequestFailed: true,
    onInstanceUnreachable: true,
  }
}

test.group('SaveNotificationSettings', () => {
  test('defaults to no auth', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const result = await new SaveNotificationSettings(repository).execute(baseInput())

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.mode, 'none')
  })

  test('configures token auth', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const result = await new SaveNotificationSettings(repository).execute({
      ...baseInput(),
      authMode: 'token',
      token: 'tk_abc123',
    })

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.mode, 'token')
    assert.equal(result.value.auth.authorizationHeader(), 'Bearer tk_abc123')
  })

  test('rejects switching to token auth without a token', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const result = await new SaveNotificationSettings(repository).execute({
      ...baseInput(),
      authMode: 'token',
    })

    assert.isFalse(result.ok)
  })

  test('configures basic auth', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const result = await new SaveNotificationSettings(repository).execute({
      ...baseInput(),
      authMode: 'basic',
      username: 'alice',
      password: 'hunter2',
    })

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.mode, 'basic')
    assert.equal(result.value.auth.username, 'alice')
  })

  test('rejects switching to basic auth without a password', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const result = await new SaveNotificationSettings(repository).execute({
      ...baseInput(),
      authMode: 'basic',
      username: 'alice',
    })

    assert.isFalse(result.ok)
  })

  test('omitting the token keeps the stored one on a later save', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const useCase = new SaveNotificationSettings(repository)
    await useCase.execute({ ...baseInput(), authMode: 'token', token: 'tk_abc123' })

    // Toggling a switch, without resending the secret.
    const result = await useCase.execute({
      ...baseInput(),
      authMode: 'token',
      onRequestFailed: false,
    })

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.authorizationHeader(), 'Bearer tk_abc123')
    assert.isFalse(result.value.onRequestFailed)
  })

  test('changing the username keeps the stored password', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const useCase = new SaveNotificationSettings(repository)
    await useCase.execute({
      ...baseInput(),
      authMode: 'basic',
      username: 'alice',
      password: 'hunter2',
    })

    const result = await useCase.execute({
      ...baseInput(),
      authMode: 'basic',
      username: 'bob',
    })

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.username, 'bob')
    assert.equal(
      result.value.auth.authorizationHeader(),
      `Basic ${Buffer.from('bob:hunter2').toString('base64')}`,
    )
  })

  test('switching back to none drops stored credentials', async ({ assert }) => {
    const repository = new InMemoryNotificationSettings()
    const useCase = new SaveNotificationSettings(repository)
    await useCase.execute({ ...baseInput(), authMode: 'token', token: 'tk_abc123' })

    const result = await useCase.execute(baseInput())

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.auth.mode, 'none')
    assert.isNull(result.value.auth.authorizationHeader())
  })
})
