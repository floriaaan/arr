export interface ConnectivityMonitor {
  isOnline: () => boolean
  subscribe: (callback: (online: boolean) => void) => () => void
}

/**
 * The real thing — wraps `navigator.onLine` and the `online`/`offline`
 * window events. Guarded for SSR: this app server-renders every route, and
 * `window` doesn't exist there. Guard on `window`, not `navigator` — Node
 * has had a global `navigator` since v21, but its `.onLine` is `undefined`,
 * so a `typeof navigator === 'undefined'` guard never fires server-side and
 * the banner renders on every SSR pass (cf. `http-client.ts`'s
 * `resolveBaseUrl` and `fake-arr-connector.ts`, which both key their SSR
 * guards off `window` for the same reason).
 *
 * `navigator.onLine` only reflects whether the OS/browser thinks it has a
 * network interface, not whether the backend is actually reachable — a
 * coarser signal than TanStack Query's own retry/error state, but the right
 * one for "should an offline banner show at all".
 */
export const browserConnectivityMonitor: ConnectivityMonitor = {
  isOnline: () => {
    return typeof window === 'undefined' ? true : navigator.onLine
  },
  subscribe: (callback) => {
    if (typeof window === 'undefined') return () => {}

    function online() {
      callback(true)
    }
    function offline() {
      callback(false)
    }

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  },
}
