import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireAdmin } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { DownloadClientsPage } from '#presentation/download-clients/download-clients-page'

export const Route = createFileRoute('/download-clients/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireAdmin(connector)
  },
  component: DownloadClientsRoute,
})

function DownloadClientsRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Download Clients</h1>
        <p className="text-sm text-muted-foreground">
          Download clients configured on each connected service, merged when the same client is
          shared across instances.
        </p>
      </div>
      <DownloadClientsPage />
    </AppShell>
  )
}
