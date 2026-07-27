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
      <SettingsPanels />
    </AppShell>
  )
}
