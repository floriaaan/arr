import type { InstallOutcome, InstallPromptController } from './install-prompt-controller'

export function createFakeInstallPromptController(
  initialCanInstall = false,
): InstallPromptController & {
  setCanInstall: (canInstall: boolean) => void
  setPromptOutcome: (outcome: InstallOutcome) => void
} {
  let canInstall = initialCanInstall
  let outcome: InstallOutcome = 'accepted'
  const listeners = new Set<(canInstall: boolean) => void>()

  return {
    canInstall: () => {
      return canInstall
    },
    subscribe: (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    prompt: async () => {
      return canInstall ? outcome : 'unavailable'
    },
    setCanInstall: (next) => {
      canInstall = next
      for (const listener of listeners) listener(next)
    },
    setPromptOutcome: (next) => {
      outcome = next
    },
  }
}
