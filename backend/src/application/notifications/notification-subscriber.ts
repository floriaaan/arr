import { appUrl } from '#config/app'
import type { EventBus } from '#application/shared/event-bus'
import type { Notifier } from '#domain/notifications/interfaces/notifier.interface'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { DomainEvent } from '#domain/shared/domain-event'

/** `APP_URL` should be the user-facing origin for these deep links to open the right page. */
const requestsUrl = `${appUrl}/requests`
const settingsUrl = `${appUrl}/settings`

/**
 * Wires the domain events that were emitted-and-dropped since day one to the
 * notifier (cf. docs/phase-6-fiabilite-requests/02, chantier 1). Every handler
 * swallows its own errors: the dispatch is synchronous, so an unreachable
 * webhook must never fail the use case that triggered it.
 *
 * `RequestProgressed` is deliberately not subscribed — it fires every 10
 * seconds for the whole life of a download. Notification bodies are plain
 * text on purpose: ntfy only renders markdown inside its own app/web client,
 * the raw `**stars**` show up as-is in the OS push banner (iOS/Android).
 */
export function registerNotificationSubscribers(
  bus: EventBus,
  deps: {
    notifier: Notifier
    settings: NotificationSettingsRepository
    requests: MediaRequestRepository
    lookup: MediaLookup
    users: UserDirectory
    onError: (message: string) => void
  },
): void {
  async function requestInfo(
    requestId: string,
  ): Promise<{ title: string; requestedBy: string; posterUrl?: string }> {
    const request = await deps.requests.findById(requestId)
    if (!request) return { title: 'A request', requestedBy: 'someone' }

    const requester = await deps.users.findById(request.requestedBy)

    let posterUrl: string | undefined
    try {
      const detail = await deps.lookup.detail(request.externalId)
      posterUrl = detail.posterRef?.remoteUrl
    } catch {
      posterUrl = undefined
    }

    return { title: request.title, requestedBy: requester?.email.value ?? 'someone', posterUrl }
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
    'MediaRequested',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestCreated || !settings.webhookUrl) return

      const { requestId } = event.payload as { requestId: string }
      const { title, requestedBy, posterUrl } = await requestInfo(requestId)
      await deps.notifier.notify({
        title: '📨 New request',
        body: `${title} was just requested by ${requestedBy}.`,
        level: 'info',
        clickUrl: requestsUrl,
        imageUrl: posterUrl,
        actions: [{ label: 'Open requests', url: requestsUrl }],
      })
    }),
  )

  bus.subscribe(
    'RequestPendingApproval',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestPendingApproval || !settings.webhookUrl) return

      const { requestId } = event.payload as { requestId: string }
      const { title, requestedBy, posterUrl } = await requestInfo(requestId)
      await deps.notifier.notify({
        title: '⏳ Approval needed',
        body: `${title} was requested by ${requestedBy} and is waiting for approval.`,
        level: 'info',
        clickUrl: requestsUrl,
        imageUrl: posterUrl,
        actions: [{ label: 'Review requests', url: requestsUrl }],
      })
    }),
  )

  bus.subscribe(
    'RequestCompleted',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestAvailable || !settings.webhookUrl) return

      const { requestId } = event.payload as { requestId: string }
      const { title, requestedBy, posterUrl } = await requestInfo(requestId)
      await deps.notifier.notify({
        title: '🎬 Request available',
        body: `${title} is ready to watch. Requested by ${requestedBy}.`,
        level: 'success',
        clickUrl: requestsUrl,
        imageUrl: posterUrl,
        actions: [{ label: 'Open requests', url: requestsUrl }],
      })
    }),
  )

  bus.subscribe(
    'RequestFailed',
    safely(async (event) => {
      const settings = await deps.settings.get()
      if (!settings.onRequestFailed || !settings.webhookUrl) return

      const { requestId, reason } = event.payload as { requestId: string; reason?: string }
      const { title, requestedBy, posterUrl } = await requestInfo(requestId)
      await deps.notifier.notify({
        title: '❌ Request failed',
        body: `${title} failed: ${reason ?? 'unknown reason'}. Requested by ${requestedBy}.`,
        level: 'error',
        clickUrl: requestsUrl,
        imageUrl: posterUrl,
        actions: [{ label: 'Open requests', url: requestsUrl }],
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
        title: '🔌 Instance unreachable',
        body: `${kind} is not answering: ${error.message}`,
        level: 'error',
        clickUrl: settingsUrl,
        actions: [{ label: 'Open settings', url: settingsUrl }],
      })
    }),
  )
}
