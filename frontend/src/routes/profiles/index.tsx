import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireAdmin } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { ProfilesPage } from '#presentation/profiles/profiles-page'

export const Route = createFileRoute('/profiles/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireAdmin(connector)
  },
  component: ProfilesRoute,
})

function ProfilesRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profiles</h1>
        <p className="text-sm text-muted-foreground">
          Manage named root folder / quality profile presets for each connected service.
        </p>
      </div>
      <ProfilesPage />
    </AppShell>
  )
}
