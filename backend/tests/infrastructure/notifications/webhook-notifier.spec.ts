import { test } from '@japa/runner'
import { WebhookNotifier } from '#infrastructure/notifications/webhook-notifier'
import { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import { NotificationAuth } from '#domain/notifications/notification-auth.vo'
import { Url } from '#domain/settings/url.vo'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'

function aUrl(raw: string) {
  const result = Url.create(raw)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

class InMemoryNotificationSettings implements NotificationSettingsRepository {
  constructor(private settings: NotificationSettings) {}

  async get(): Promise<NotificationSettings> {
    return this.settings
  }

  async save(settings: NotificationSettings): Promise<void> {
    this.settings = settings
  }
}

function settingsWith(webhookUrl: string | null, auth = NotificationAuth.none()) {
  const settings = NotificationSettings.create('id-1')
  settings.configure({
    webhookUrl: webhookUrl ? aUrl(webhookUrl) : null,
    auth,
    onRequestAvailable: true,
    onRequestFailed: true,
    onInstanceUnreachable: true,
  })
  return settings
}

function stubFetch() {
  const calls: { url: string; init: RequestInit }[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: url.toString(), init })
    return new Response(null, { status: 200 })
  }) as typeof fetch
  return {
    calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

test.group('WebhookNotifier', () => {
  test('posts to the ntfy server root, not the topic path', async ({ assert, cleanup }) => {
    const { calls, restore } = stubFetch()
    cleanup(restore)

    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(settingsWith('https://ntfy.example.com/my-topic')),
    )
    await notifier.notify({ title: 'Hello', body: 'World', level: 'info' })

    assert.lengthOf(calls, 1)
    assert.equal(calls[0]?.url, 'https://ntfy.example.com')
  })

  test('carries the topic, title, message, tags, priority and markdown in the JSON body', async ({
    assert,
    cleanup,
  }) => {
    const { calls, restore } = stubFetch()
    cleanup(restore)

    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(settingsWith('https://ntfy.example.com/my-topic')),
    )
    await notifier.notify({
      title: '🎬 Request available',
      body: '**Fight Club**',
      level: 'success',
    })

    const body = JSON.parse(String(calls[0]?.init.body))
    assert.equal(body.topic, 'my-topic')
    assert.equal(body.title, '🎬 Request available')
    assert.equal(body.message, '**Fight Club**')
    assert.deepEqual(body.tags, ['tada'])
    assert.equal(body.priority, 3)
    assert.isTrue(body.markdown)
  })

  test('uses a higher priority for errors', async ({ assert, cleanup }) => {
    const { calls, restore } = stubFetch()
    cleanup(restore)

    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(settingsWith('https://ntfy.example.com/my-topic')),
    )
    await notifier.notify({ title: 'Oops', body: 'Broken', level: 'error' })

    const body = JSON.parse(String(calls[0]?.init.body))
    assert.equal(body.priority, 5)
  })

  test('carries click and actions when provided', async ({ assert, cleanup }) => {
    const { calls, restore } = stubFetch()
    cleanup(restore)

    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(settingsWith('https://ntfy.example.com/my-topic')),
    )
    await notifier.notify({
      title: 'Hello',
      body: 'World',
      level: 'info',
      clickUrl: 'https://arr.example.com/requests',
      actions: [{ label: 'Open requests', url: 'https://arr.example.com/requests' }],
    })

    const body = JSON.parse(String(calls[0]?.init.body))
    assert.equal(body.click, 'https://arr.example.com/requests')
    assert.deepEqual(body.actions, [
      { action: 'view', label: 'Open requests', url: 'https://arr.example.com/requests' },
    ])
  })

  test('sends a Bearer Authorization header for token auth', async ({ assert, cleanup }) => {
    const { calls, restore } = stubFetch()
    cleanup(restore)

    const auth = NotificationAuth.token('tk_abc123')
    if (!auth.ok) throw new Error('unreachable')
    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(
        settingsWith('https://ntfy.example.com/my-topic', auth.value),
      ),
    )
    await notifier.notify({ title: 'Hello', body: 'World', level: 'info' })

    const headers = calls[0]?.init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer tk_abc123')
  })

  test('fails without a configured webhook', async ({ assert }) => {
    const notifier = new WebhookNotifier(new InMemoryNotificationSettings(settingsWith(null)))
    const result = await notifier.notify({ title: 'Hello', body: 'World', level: 'info' })

    assert.isFalse(result.ok)
    if (result.ok) return
    assert.equal(result.error.type, 'not_configured')
  })

  test('fails when the URL has no topic path', async ({ assert }) => {
    const notifier = new WebhookNotifier(
      new InMemoryNotificationSettings(settingsWith('https://ntfy.example.com')),
    )
    const result = await notifier.notify({ title: 'Hello', body: 'World', level: 'info' })

    assert.isFalse(result.ok)
    if (result.ok) return
    assert.equal(result.error.type, 'delivery_failed')
  })
})
