import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireAdmin } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { IndexersPage } from '#presentation/indexers/indexers-page'

export const Route = createFileRoute('/indexers/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireAdmin(connector)
  },
  component: IndexersRoute,
})

function IndexersRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Indexers</h1>
        <p className="text-sm text-muted-foreground">
          Indexers configured on each connected service, merged when the same indexer is shared
          across instances.
        </p>
      </div>
      <IndexersPage />
    </AppShell>
  )
}
