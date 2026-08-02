import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { LinkedAccountsPanel } from '#presentation/account/linked-accounts-panel'

export const Route = createFileRoute('/account/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
  },
  component: AccountRoute,
})

function AccountRoute() {
  return (
    <AppShell>
      <LinkedAccountsPanel />
    </AppShell>
  )
}
