import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createConnector, getCookieHeader } from '../../providers/create-connector'
import { requireOnboarded } from '#presentation/shared/route-guards'
import { LoginForm } from '#presentation/identity/login-form'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    const session = await connector.getSession()
    if (session.user) throw redirect({ to: '/requests' })
  },
  component: LoginRoute,
})

function LoginRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <LoginForm
      onSignedIn={() => {
        void queryClient.invalidateQueries({ queryKey: ['session'] })
        void navigate({ to: '/requests' })
      }}
    />
  )
}
