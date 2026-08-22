import type { ConnectivityMonitor } from './connectivity-monitor'

/**
 * Test double — mirrors `infrastructure/fake/fake-arr-connector.ts`'s
 * shape. `setOnline` drives it directly instead of dispatching real browser
 * events, so tests don't depend on jsdom's limited online/offline event
 * support.
 */
export function createFakeConnectivityMonitor(
  initialOnline = true,
): ConnectivityMonitor & { setOnline: (online: boolean) => void } {
  let online = initialOnline
  const listeners = new Set<(online: boolean) => void>()

  return {
    isOnline: () => {
      return online
    },
    subscribe: (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    setOnline: (next) => {
      online = next
      for (const listener of listeners) listener(next)
    },
  }
}
