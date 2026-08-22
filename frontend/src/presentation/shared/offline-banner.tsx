import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from './use-online-status'
import type { ConnectivityMonitor } from './connectivity-monitor'

/**
 * Rendered once at the document root (cf. __root.tsx), not per-shell — one
 * integration point covers login/setup and every AppShell page uniformly.
 * Reuses existing neutral/status tokens, no new visual system.
 */
export function OfflineBanner({ monitor }: { monitor?: ConnectivityMonitor }) {
  const online = useOnlineStatus(monitor)

  if (online) return null

  return (
    <div className="flex items-center justify-center gap-2 border-b bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <WifiOff className="size-3.5 shrink-0" />
      You're offline — some data may be out of date.
    </div>
  )
}
