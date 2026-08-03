import { test } from '@japa/runner'
import { InMemoryEventBus } from '#application/shared/event-bus'
import { registerNotificationSubscribers } from '#application/notifications/notification-subscriber'
import { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import { NotificationAuth } from '#domain/notifications/notification-auth.vo'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { PosterRef } from '#domain/catalog/poster-ref.vo'
import { User } from '#domain/identity/user.entity'
import { Email } from '#domain/identity/email.vo'
import { Url } from '#domain/settings/url.vo'
import { Result } from '#domain/shared/result'
import {
  mediaRequested,
  requestCompleted,
  requestFailed,
  requestPendingApproval,
} from '#domain/requests/requests.events'
import { instanceHealthCheckFailed } from '#domain/settings/settings.events'
import { InMemoryMediaRequestRepository } from '../requests/fakes.js'
import type { Notification } from '#domain/notifications/notification.vo'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationError } from '#domain/notifications/notification-error.vo'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'

class RecordingNotifier implements Notifier {
  sent: Notification[] = []
  nextResult: Result<void, NotificationError> = Result.ok(undefined)

  async notify(notification: Notification): Promise<Result<void, NotificationError>> {
    this.sent.push(notification)
    return this.nextResult
  }
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

class FakeMediaLookup implements MediaLookup {
  async search(): Promise<never[]> {
    return []
  }

  async detail(id: ExternalId): Promise<MediaDetail> {
    return MediaDetail.create(id, {
      kind: 'movie',
      title: 'Fight Club',
      year: 1999,
      overview: '',
      posterRef: PosterRef.create('https://image.tmdb.org/t/p/w500/poster.jpg'),
      alreadyManaged: false,
      genres: [],
    })
  }
}

class FakeUserDirectory implements UserDirectory {
  async findById(): Promise<User> {
    const email = Email.create('alice@example.test')
    if (!email.ok) throw new Error('unreachable')
    return User.create('user-1', { email: email.value, role: 'user', createdAt: new Date() })
  }

  async findByEmail(): Promise<null> {
    return null
  }

  async existsAny(): Promise<boolean> {
    return true
  }
}

function aUrl(raw = 'https://hooks.example.test/abc') {
  const result = Url.create(raw)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function settingsWith(overrides: Partial<Parameters<NotificationSettings['configure']>[0]> = {}) {
  const settings = NotificationSettings.create('id-1')
  settings.configure({
    webhookUrl: aUrl(),
    auth: NotificationAuth.none(),
    onRequestCreated: true,
    onRequestAvailable: true,
    onRequestFailed: true,
    onInstanceUnreachable: true,
    onRequestPendingApproval: true,
    ...overrides,
  })
  return settings
}

async function setup(settings = settingsWith()) {
  const bus = new InMemoryEventBus()
  const notifier = new RecordingNotifier()
  const requests = new InMemoryMediaRequestRepository()
  const errors: string[] = []

  const externalId = ExternalId.create('tmdb', '550')
  if (!externalId.ok) throw new Error('unreachable')
  await requests.save(
    MediaRequest.request(
      'request-1',
      {
        requestedBy: 'user-1',
        kind: 'movie',
        externalId: externalId.value,
        title: 'Fight Club',
        instanceId: 'instance-1',
        origin: 'manual',
        requiresApproval: false,
      },
      new Date(),
    ),
  )

  registerNotificationSubscribers(bus, {
    notifier,
    settings: new InMemoryNotificationSettings(settings),
    requests,
    lookup: new FakeMediaLookup(),
    users: new FakeUserDirectory(),
    onError: (message) => errors.push(message),
  })

  return { bus, notifier, errors }
}

test.group('notification subscribers', () => {
  test('notifies when a request is created', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([
      mediaRequested({ requestId: 'request-1', kind: 'movie', externalId: 'tmdb:550' }, new Date()),
    ])

    assert.lengthOf(notifier.sent, 1)
    assert.equal(notifier.sent[0]?.level, 'info')
    assert.include(notifier.sent[0]?.body ?? '', 'Fight Club')
    assert.include(notifier.sent[0]?.body ?? '', 'alice@example.test')
    assert.notInclude(notifier.sent[0]?.body ?? '', '**')
    assert.equal(notifier.sent[0]?.imageUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg')
  })

  test('stays silent on creation when the matching switch is off', async ({ assert }) => {
    const { bus, notifier } = await setup(settingsWith({ onRequestCreated: false }))

    await bus.publish([
      mediaRequested({ requestId: 'request-1', kind: 'movie', externalId: 'tmdb:550' }, new Date()),
    ])

    assert.isEmpty(notifier.sent)
  })

  test('notifies when a request becomes available', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([requestCompleted({ requestId: 'request-1' }, new Date())])

    assert.lengthOf(notifier.sent, 1)
    assert.equal(notifier.sent[0]?.level, 'success')
    assert.include(notifier.sent[0]?.body ?? '', 'Fight Club')
    assert.include(notifier.sent[0]?.body ?? '', 'alice@example.test')
    assert.notInclude(notifier.sent[0]?.body ?? '', '**')
    assert.equal(notifier.sent[0]?.imageUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg')
  })

  test('notifies on failure, carrying the reason', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([
      requestFailed({ requestId: 'request-1', reason: 'No space left' }, new Date()),
    ])

    assert.equal(notifier.sent[0]?.level, 'error')
    assert.include(notifier.sent[0]?.body ?? '', 'No space left')
    assert.include(notifier.sent[0]?.body ?? '', 'alice@example.test')
    assert.notInclude(notifier.sent[0]?.body ?? '', '**')
  })

  test('notifies when a request needs approval', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([requestPendingApproval({ requestId: 'request-1' }, new Date())])

    assert.lengthOf(notifier.sent, 1)
    assert.include(notifier.sent[0]?.body ?? '', 'Fight Club')
    assert.include(notifier.sent[0]?.body ?? '', 'alice@example.test')
  })

  test('stays silent on pending approval when the matching switch is off', async ({ assert }) => {
    const { bus, notifier } = await setup(settingsWith({ onRequestPendingApproval: false }))

    await bus.publish([requestPendingApproval({ requestId: 'request-1' }, new Date())])

    assert.isEmpty(notifier.sent)
  })

  test('notifies when an instance stops answering', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([
      instanceHealthCheckFailed(
        {
          instanceId: 'instance-1',
          kind: 'radarr',
          error: { type: 'timeout', message: 'timed out' },
        },
        new Date(),
      ),
    ])

    assert.lengthOf(notifier.sent, 1)
    assert.include(notifier.sent[0]?.body ?? '', 'radarr')
  })

  test('stays silent when the matching switch is off', async ({ assert }) => {
    const { bus, notifier } = await setup(settingsWith({ onRequestAvailable: false }))

    await bus.publish([requestCompleted({ requestId: 'request-1' }, new Date())])

    assert.isEmpty(notifier.sent)
  })

  test('stays silent when no webhook is configured', async ({ assert }) => {
    const { bus, notifier } = await setup(settingsWith({ webhookUrl: null }))

    await bus.publish([requestCompleted({ requestId: 'request-1' }, new Date())])

    assert.isEmpty(notifier.sent)
  })

  test('never lets a failing subscriber escape to the caller', async ({ assert }) => {
    const { bus, notifier, errors } = await setup()
    notifier.notify = async () => {
      throw new Error('webhook exploded')
    }

    // The publish must resolve — a broken webhook cannot fail the use case
    // that emitted the event.
    await bus.publish([requestCompleted({ requestId: 'request-1' }, new Date())])

    assert.deepEqual(errors, ['webhook exploded'])
    assert.isEmpty(notifier.sent)
  })

  test('ignores progress events entirely', async ({ assert }) => {
    const { bus, notifier } = await setup()

    await bus.publish([
      { name: 'RequestProgressed', occurredAt: new Date(), payload: { requestId: 'request-1' } },
    ])

    assert.isEmpty(notifier.sent)
  })
})
