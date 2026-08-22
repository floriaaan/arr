import { useEffect, useState } from 'react'
import { browserConnectivityMonitor } from './connectivity-monitor'
import type { ConnectivityMonitor } from './connectivity-monitor'

export function useOnlineStatus(
  monitor: ConnectivityMonitor = browserConnectivityMonitor,
): boolean {
  const [online, setOnline] = useState(() => monitor.isOnline())

  useEffect(() => {
    setOnline(monitor.isOnline())
    return monitor.subscribe(setOnline)
  }, [monitor])

  return online
}
