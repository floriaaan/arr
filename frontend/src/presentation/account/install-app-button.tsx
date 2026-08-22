import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { useInstallPrompt } from '#presentation/shared/use-install-prompt'
import type { InstallPromptController } from '#presentation/shared/install-prompt-controller'

function defaultIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Since iPadOS 13, Safari on iPad sends a desktop-like UA with no `iPad`
 * token at all, so the classic `/iPad|iPhone|iPod/` test alone misses every
 * modern iPad. Detect that case by its own signature instead: a `MacIntel`
 * platform (what iPadOS reports) that also reports touch points (what no
 * real Mac does). Guards both `navigator` and `window` before touching
 * either — the previous version only survived on `&&` short-circuit
 * ordering (checked `navigator`, then unconditionally read `window`).
 */
function defaultIsIos(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const isIphoneOrIpod = /iPhone|iPod/.test(navigator.userAgent)
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return (isIphoneOrIpod || isIpadOs) && !('MSStream' in window)
}

/**
 * Hidden entirely once already installed. Otherwise: a real button on
 * Chromium (captures `beforeinstallprompt`), or static instructions on iOS
 * Safari — there's no install API there at all, so a button would have
 * nothing to trigger. `isStandalone`/`isIos` are injectable so tests don't
 * need to stub `window.matchMedia`/`navigator.userAgent` globally.
 *
 * Both platform checks are deferred to a post-mount effect, not called
 * during render: server-side, `navigator.userAgent` is Node's own UA
 * string, so `isIos()` always evaluates `false` during SSR. On an actual
 * iPhone, the client's first render would then disagree with the
 * server-rendered markup — a hydration mismatch. `platformChecked` gates
 * rendering the Card at all until that first effect has run, so the
 * server-rendered markup (nothing) matches the client's pre-effect render
 * (also nothing) exactly.
 */
export function InstallAppButton({
  controller,
  isStandalone = defaultIsStandalone,
  isIos = defaultIsIos,
}: {
  controller?: InstallPromptController
  isStandalone?: () => boolean
  isIos?: () => boolean
}) {
  const { canInstall, prompt } = useInstallPrompt(controller)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [platformChecked, setPlatformChecked] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIos(isIos())
    setPlatformChecked(true)
  }, [isStandalone, isIos])

  if (!platformChecked) return null
  if (installed) return null
  if (!canInstall && !ios) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install app</CardTitle>
        <CardDescription>Open arr like an app, without the browser's address bar.</CardDescription>
      </CardHeader>
      <CardContent>
        {canInstall ? (
          <Button
            onClick={async () => {
              const outcome = await prompt()
              if (outcome === 'dismissed') toast.info('Install dismissed.')
            }}
          >
            <Download className="size-4" />
            Install app
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            On iPhone/iPad: tap Share, then "Add to Home Screen".
          </p>
        )}
      </CardContent>
    </Card>
  )
}
