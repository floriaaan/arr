import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { CalendarGrid } from '#presentation/calendar/calendar-grid'

export const Route = createFileRoute('/calendar/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
  },
  component: CalendarRoute,
})

function CalendarRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming and recent releases across Radarr, Sonarr, and Lidarr.
        </p>
      </div>
      <CalendarGrid />
    </AppShell>
  )
}
