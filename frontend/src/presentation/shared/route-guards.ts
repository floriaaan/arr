import { redirect } from '@tanstack/react-router'
import type { ArrConnector } from '#domain/interfaces/arr-connector'
import type { AuthenticatedUser } from '#domain/identity/user'

/**
 * Onboarding before session (cf. docs/phase-5 decision 5) — checking session
 * first would flash a login screen on an instance that's never even been
 * set up.
 */
export async function requireOnboarded(connector: ArrConnector): Promise<void> {
  const { status } = await connector.getOnboardingState()
  if (status !== 'completed') throw redirect({ to: '/setup' })
}

export async function requireSession(connector: ArrConnector): Promise<AuthenticatedUser> {
  const session = await connector.getSession()
  if (!session.user) throw redirect({ to: '/login' })
  return session.user
}

export async function requireAdmin(connector: ArrConnector): Promise<AuthenticatedUser> {
  const user = await requireSession(connector)
  if (user.role !== 'admin') throw redirect({ to: '/requests' })
  return user
}
