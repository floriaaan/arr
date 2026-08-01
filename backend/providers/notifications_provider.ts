import type { ApplicationService } from '@adonisjs/core/types'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'

/**
 * Binds the notification ports and — in `boot()` — registers the event
 * subscribers. This is the piece that finally makes the domain events do
 * something: they were emitted and dropped since day one (cf.
 * docs/phase-6-fiabilite-requests/02, chantier 1).
 */
export default class NotificationsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('notifications.settingsRepository', async () => {
      const { LucidNotificationSettingsRepository } =
        await import('#infrastructure/persistence/notifications/notification-settings.repository')
      return new LucidNotificationSettingsRepository()
    })

    this.app.container.singleton('notifications.notifier', async (resolver) => {
      const { WebhookNotifier } = await import('#infrastructure/notifications/webhook-notifier')
      const settings = await resolver.make('notifications.settingsRepository')
      return new WebhookNotifier(settings)
    })
  }

  async boot() {
    const { registerNotificationSubscribers } =
      await import('#application/notifications/notification-subscriber')
    const logger = await this.app.container.make('logger')

    registerNotificationSubscribers(await this.app.container.make('shared.eventBus'), {
      notifier: await this.app.container.make('notifications.notifier'),
      settings: await this.app.container.make('notifications.settingsRepository'),
      requests: await this.app.container.make('requests.repository'),
      lookup: await this.app.container.make('catalog.mediaLookup'),
      users: await this.app.container.make('identity.userDirectory'),
      onError: (message) => logger.warn(`Notification subscriber failed: ${message}`),
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'notifications.settingsRepository': NotificationSettingsRepository
    'notifications.notifier': Notifier
  }
}
