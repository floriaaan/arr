import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireAdmin } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { SettingsPanels } from '#presentation/settings/settings-panels'

export const Route = createFileRoute('/settings/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireAdmin(connector)
  },
  component: SettingsRoute,
})

function SettingsRoute() {
  return (
    <AppShell>
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage connected services, single sign-on, and authentication.
        </p>
      </div>
      <SettingsPanels />
    </AppShell>
  )
}
