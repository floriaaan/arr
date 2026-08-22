import { describe, test, expect, vi } from 'vitest'
import { createFakeConnectivityMonitor } from '#presentation/shared/fake-connectivity-monitor'

describe('createFakeConnectivityMonitor', () => {
  test('defaults to online', () => {
    expect(createFakeConnectivityMonitor().isOnline()).toBe(true)
  })

  test('starts offline when told to', () => {
    expect(createFakeConnectivityMonitor(false).isOnline()).toBe(false)
  })

  test('notifies subscribers when setOnline is called', () => {
    const monitor = createFakeConnectivityMonitor(true)
    const callback = vi.fn()
    monitor.subscribe(callback)

    monitor.setOnline(false)

    expect(callback).toHaveBeenCalledWith(false)
    expect(monitor.isOnline()).toBe(false)
  })

  test('unsubscribe stops further notifications', () => {
    const monitor = createFakeConnectivityMonitor(true)
    const callback = vi.fn()
    const unsubscribe = monitor.subscribe(callback)

    unsubscribe()
    monitor.setOnline(false)

    expect(callback).not.toHaveBeenCalled()
  })
})
