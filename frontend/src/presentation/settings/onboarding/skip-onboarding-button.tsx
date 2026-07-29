import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { FastForward, Loader2 } from 'lucide-react'
import { useArrConnector } from '#application/shared/connector-context'
import { Button } from '#presentation/ui/button'

const FAKE_ADMIN_EMAIL = 'admin@example.com'
const FAKE_ADMIN_PASSWORD = 'Password123!'

/**
 * Dev-only shortcut for `task dev:fake` — walks the whole onboarding wizard
 * in one call (admin account, one enabled Radarr instance, completion, sign
 * in) so testing the app doesn't require clicking through every step every
 * time state resets. Never rendered against the real backend: `HttpArrConnector`
 * enforces the actual admin/instance/health-check rules this button skips.
 */
export function SkipOnboardingButton() {
  if (import.meta.env.VITE_CONNECTOR !== 'fake') return null
  return <SkipOnboardingButtonImpl />
}

function SkipOnboardingButtonImpl() {
  const connector = useArrConnector()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function handleSkip() {
    setPending(true)
    try {
      const admin = await connector.createAdminAccount(FAKE_ADMIN_EMAIL, FAKE_ADMIN_PASSWORD)
      if (!admin.ok && admin.error.type !== 'admin_already_exists') {
        throw new Error(admin.error.message)
      }

      const instance = await connector.saveOnboardingInstance('radarr', {
        baseUrl: 'http://localhost:7878',
        apiKey: 'fake-api-key',
        rootFolderPath: '/data/movies',
        qualityProfileId: 3,
        enabled: true,
      })
      if (!instance.ok) throw new Error(instance.error.message)

      const completed = await connector.completeOnboarding()
      if (!completed.ok) throw new Error(completed.error.message)

      await connector.signInWithPassword(FAKE_ADMIN_EMAIL, FAKE_ADMIN_PASSWORD)
      await navigate({ to: '/requests' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not skip onboarding.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleSkip}
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FastForward className="size-4" />}
      {pending ? 'Skipping…' : 'Skip onboarding (fake mode)'}
    </Button>
  )
}
