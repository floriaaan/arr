import { describe, test, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { InstallAppButton } from '#presentation/account/install-app-button'
import { createFakeInstallPromptController } from '#presentation/shared/fake-install-prompt-controller'

afterEach(() => cleanup())

describe('InstallAppButton', () => {
  test('renders nothing when there is no install signal and the platform is not iOS', () => {
    const controller = createFakeInstallPromptController(false)
    render(<InstallAppButton controller={controller} isIos={() => false} />)
    expect(screen.queryByText('Install app')).not.toBeInTheDocument()
  })

  test('renders an install button once the browser signals it can install', () => {
    const controller = createFakeInstallPromptController(true)
    render(<InstallAppButton controller={controller} isIos={() => false} />)
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument()
  })

  test('shows iOS instructions instead of a button on iOS with no install signal', () => {
    const controller = createFakeInstallPromptController(false)
    render(<InstallAppButton controller={controller} isIos={() => true} />)
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
  })

  test('renders nothing once already installed, even if the browser could otherwise prompt', () => {
    const controller = createFakeInstallPromptController(true)
    render(
      <InstallAppButton controller={controller} isStandalone={() => true} isIos={() => false} />,
    )
    expect(screen.queryByText('Install app')).not.toBeInTheDocument()
  })
})
