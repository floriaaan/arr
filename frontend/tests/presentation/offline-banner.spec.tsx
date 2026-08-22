import { describe, test, expect, afterEach } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { OfflineBanner } from '#presentation/shared/offline-banner'
import { createFakeConnectivityMonitor } from '#presentation/shared/fake-connectivity-monitor'

afterEach(() => cleanup())

describe('OfflineBanner', () => {
  test('renders nothing while online', () => {
    const monitor = createFakeConnectivityMonitor(true)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  test('shows the banner once offline', () => {
    const monitor = createFakeConnectivityMonitor(false)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  test('hides again once back online', () => {
    const monitor = createFakeConnectivityMonitor(false)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()

    act(() => monitor.setOnline(true))

    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })
})
