import { createFileRoute, redirect } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
    throw redirect({ to: '/requests' })
  },
})
