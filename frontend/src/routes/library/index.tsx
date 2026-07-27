import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { LibraryGrid } from '#presentation/library/library-grid'

export const Route = createFileRoute('/library/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
  },
  component: LibraryRoute,
})

function LibraryRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Everything already managed by your Radarr, Sonarr, and Lidarr instances.
        </p>
      </div>
      <LibraryGrid />
    </AppShell>
  )
}
