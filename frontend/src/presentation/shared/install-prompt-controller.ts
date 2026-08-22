export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export interface InstallPromptController {
  canInstall: () => boolean
  subscribe: (callback: (canInstall: boolean) => void) => () => void
  prompt: () => Promise<InstallOutcome>
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures Chromium's `beforeinstallprompt` — the only browser family that
 * fires it. `canInstall()` is simply `false` everywhere else (iOS Safari,
 * Firefox, or once already running standalone), with no user-agent sniffing
 * needed for that part; `InstallAppButton` (Task 8) handles the iOS-hint
 * branch itself, since there's no capability signal for it at all.
 *
 * Guarded for SSR: this factory runs at module-import time, which happens
 * server-side too — `typeof window !== 'undefined'` keeps it a no-op there.
 */
function createBrowserInstallPromptController(): InstallPromptController {
  let capturedEvent: BeforeInstallPromptEvent | null = null
  const listeners = new Set<(canInstall: boolean) => void>()

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      capturedEvent = event as BeforeInstallPromptEvent
      for (const listener of listeners) listener(true)
    })
    window.addEventListener('appinstalled', () => {
      capturedEvent = null
      for (const listener of listeners) listener(false)
    })
  }

  return {
    canInstall: () => {
      return capturedEvent !== null
    },
    subscribe: (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    prompt: async () => {
      if (!capturedEvent) return 'unavailable'
      await capturedEvent.prompt()
      const { outcome } = await capturedEvent.userChoice
      capturedEvent = null
      return outcome
    },
  }
}

export const browserInstallPromptController = createBrowserInstallPromptController()
