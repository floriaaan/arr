export interface ConnectivityMonitor {
  isOnline: () => boolean
  subscribe: (callback: (online: boolean) => void) => () => void
}

/**
 * The real thing — wraps `navigator.onLine` and the `online`/`offline`
 * window events. Guarded for SSR: this app server-renders every route, and
 * neither `navigator` nor `window` exists there.
 *
 * `navigator.onLine` only reflects whether the OS/browser thinks it has a
 * network interface, not whether the backend is actually reachable — a
 * coarser signal than TanStack Query's own retry/error state, but the right
 * one for "should an offline banner show at all".
 */
export const browserConnectivityMonitor: ConnectivityMonitor = {
  isOnline: () => {
    return typeof navigator === 'undefined' ? true : navigator.onLine
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
