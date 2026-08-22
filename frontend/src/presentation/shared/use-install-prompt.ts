import { useEffect, useState } from 'react'
import { browserInstallPromptController } from './install-prompt-controller'
import type { InstallOutcome, InstallPromptController } from './install-prompt-controller'

export function useInstallPrompt(
  controller: InstallPromptController = browserInstallPromptController,
): { canInstall: boolean; prompt: () => Promise<InstallOutcome> } {
  const [canInstall, setCanInstall] = useState(() => controller.canInstall())

  useEffect(() => {
    setCanInstall(controller.canInstall())
    return controller.subscribe(setCanInstall)
  }, [controller])

  return { canInstall, prompt: () => controller.prompt() }
}
