import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createConnector, getCookieHeader } from '../../providers/create-connector'
import { requireOnboarded } from '#presentation/shared/route-guards'
import { LoginForm } from '#presentation/identity/login-form'
import { ThemeToggle } from '#presentation/shared/theme-toggle'

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
    <>
      {/* Outside `AppShell`, so the theme picker gets its own anchor here —
          otherwise the whole signed-out surface is unreachable for it. */}
      <div className="fixed top-4 right-4 z-10 w-32">
        <ThemeToggle />
      </div>
      <LoginForm
        onSignedIn={() => {
          void queryClient.invalidateQueries({ queryKey: ['session'] })
          void navigate({ to: '/requests' })
        }}
      />
    </>
  )
}
