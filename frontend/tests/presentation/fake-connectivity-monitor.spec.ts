import { describe, test, expect, vi } from 'vitest'
import { createFakeConnectivityMonitor } from '#presentation/shared/fake-connectivity-monitor'
import { browserConnectivityMonitor } from '#presentation/shared/connectivity-monitor'

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

describe('browserConnectivityMonitor', () => {
  // Regression test for the real bug that shipped: `isOnline()` used to
  // guard on `typeof navigator === 'undefined'`, which never fires in
  // Node (Node has a global `navigator` since v21, but its `.onLine` is
  // `undefined`), and never fires in jsdom either since jsdom has both
  // `window` and `navigator`. Only the fake had test coverage before this,
  // so this exact regression shipped unnoticed. This test exercises the
  // real implementation, in an environment (jsdom) that does have
  // `window`, and asserts the return type is a genuine boolean rather than
  // `undefined`.
  test('isOnline() returns a boolean in this (jsdom) environment', () => {
    const online = browserConnectivityMonitor.isOnline()
    expect(typeof online).toBe('boolean')
  })
})
