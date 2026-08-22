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

function defaultIsIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

/**
 * Hidden entirely once already installed. Otherwise: a real button on
 * Chromium (captures `beforeinstallprompt`), or static instructions on iOS
 * Safari — there's no install API there at all, so a button would have
 * nothing to trigger. `isStandalone`/`isIos` are injectable so tests don't
 * need to stub `window.matchMedia`/`navigator.userAgent` globally.
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

  useEffect(() => {
    setInstalled(isStandalone())
  }, [isStandalone])

  if (installed) return null
  if (!canInstall && !isIos()) return null

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
