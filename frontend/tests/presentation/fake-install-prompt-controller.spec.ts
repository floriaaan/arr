import { describe, test, expect, vi } from 'vitest'
import { createFakeInstallPromptController } from '#presentation/shared/fake-install-prompt-controller'

describe('createFakeInstallPromptController', () => {
  test('defaults to not installable', () => {
    expect(createFakeInstallPromptController().canInstall()).toBe(false)
  })

  test('prompt() resolves "unavailable" when not installable', async () => {
    const controller = createFakeInstallPromptController(false)
    expect(await controller.prompt()).toBe('unavailable')
  })

  test('prompt() resolves the configured outcome when installable', async () => {
    const controller = createFakeInstallPromptController(true)
    controller.setPromptOutcome('dismissed')
    expect(await controller.prompt()).toBe('dismissed')
  })

  test('notifies subscribers when setCanInstall changes', () => {
    const controller = createFakeInstallPromptController(false)
    const callback = vi.fn()
    controller.subscribe(callback)

    controller.setCanInstall(true)

    expect(callback).toHaveBeenCalledWith(true)
    expect(controller.canInstall()).toBe(true)
  })
})
