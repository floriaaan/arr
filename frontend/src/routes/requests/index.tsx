import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { RequestsTimeline } from '#presentation/requests/requests-timeline'

export const Route = createFileRoute('/requests/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
  },
  component: RequestsRoute,
})

function RequestsRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
        <p className="text-sm text-muted-foreground">
          Everything requested for Radarr, Sonarr, and Lidarr, in one timeline.
        </p>
      </div>
      <RequestsTimeline />
    </AppShell>
  )
}
