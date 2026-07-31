import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { FastForward, Loader2 } from 'lucide-react'
import { useArrConnector } from '#application/shared/connector-context'
import { Button } from '#presentation/ui/button'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'

const FAKE_ADMIN_EMAIL = 'admin@example.com'
const FAKE_ADMIN_PASSWORD = 'Password123!'

/** Root folders and quality profile ids match `FakeArrConnector`'s catalogs. */
const FAKE_INSTANCES = [
  {
    kind: 'radarr',
    draft: {
      baseUrl: 'http://localhost:7878',
      apiKey: 'fake-api-key',
      rootFolderPath: '/data/movies',
      qualityProfileId: 3,
      enabled: true,
    },
  },
  {
    kind: 'sonarr',
    draft: {
      baseUrl: 'http://localhost:8989',
      apiKey: 'fake-api-key',
      rootFolderPath: '/data/tv',
      qualityProfileId: 3,
      enabled: true,
    },
  },
  {
    kind: 'lidarr',
    draft: {
      baseUrl: 'http://localhost:8686',
      apiKey: 'fake-api-key',
      rootFolderPath: '/data/music',
      qualityProfileId: 2,
      enabled: true,
    },
  },
] as const satisfies ReadonlyArray<{ kind: ServarrKind; draft: InstanceDraft }>

/**
 * Dev-only shortcut for `task dev:fake` — walks the whole onboarding wizard
 * in one call (admin account, the three enabled instances, completion, sign
 * in) so testing the app doesn't require clicking through every step every
 * time state resets. Never rendered against the real backend: `HttpArrConnector`
 * enforces the actual admin/instance/health-check rules this button skips.
 *
 * All three kinds, not just Radarr: with only Radarr configured, requesting a
 * series or an album fails with "no active instance", so none of the
 * Sonarr/Lidarr flows could be exercised in fake mode at all.
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

      for (const instance of FAKE_INSTANCES) {
        const saved = await connector.saveOnboardingInstance(instance.kind, instance.draft)
        if (!saved.ok) throw new Error(saved.error.message)
      }

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
