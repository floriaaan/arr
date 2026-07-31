import type { EventBus } from '#application/shared/event-bus'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { DomainEvent } from '#domain/shared/domain-event'

/**
 * Wires the domain events that were emitted-and-dropped since day one to the
 * notifier (cf. docs/phase-6-fiabilite-requests/02, chantier 1). Every handler
 * swallows its own errors: the dispatch is synchronous, so an unreachable
 * webhook must never fail the use case that triggered it.
 *
 * `RequestProgressed` is deliberately not subscribed — it fires every 10
 * seconds for the whole life of a download.
 */
export function registerNotificationSubscribers(
  bus: EventBus,
  deps: {
    notifier: Notifier
    settings: NotificationSettingsRepository
    requests: MediaRequestRepository
    onError: (message: string) => void
  },
): void {
  async function titleOf(requestId: string): Promise<string> {
    const request = await deps.requests.findById(requestId)
    return request?.title ?? 'A request'
  }

  function safely(handler: (event: DomainEvent) => Promise<void>) {
    return async (event: DomainEvent) => {
      try {
        await handler(event)
      } catch (error) {
        deps.onError(error instanceof Error ? error.message : String(error))
      }
    }
  }

  bus.subscribe(
    'RequestCompleted',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestAvailable || !settings.webhookUrl) return

      const { requestId } = event.payload as { requestId: string }
      await deps.notifier.notify({
        title: 'Request available',
        body: `${await titleOf(requestId)} is ready to watch.`,
        level: 'success',
      })
    }),
  )

  bus.subscribe(
    'RequestFailed',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestFailed || !settings.webhookUrl) return

      const { requestId, reason } = event.payload as { requestId: string; reason?: string }
      await deps.notifier.notify({
        title: 'Request failed',
        body: `${await titleOf(requestId)} failed: ${reason ?? 'unknown reason'}`,
        level: 'error',
      })
    }),
  )

  bus.subscribe(
    'InstanceHealthCheckFailed',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onInstanceUnreachable || !settings.webhookUrl) return

      const { kind, error } = event.payload as { kind: string; error: { message: string } }
      await deps.notifier.notify({
        title: 'Instance unreachable',
        body: `${kind} is not answering: ${error.message}`,
        level: 'error',
      })
    }),
  )
}
