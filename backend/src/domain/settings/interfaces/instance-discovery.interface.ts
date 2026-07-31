import type { DiscoveredInstance } from '../discovered-instance.vo.js'

export interface DiscoveryScope {
  /** A NAS or another machine the user knows about; `null` to only probe the well-known hosts. */
  extraHost: string | null
  /** Opt-in: sweeps the /24 of every non-loopback IPv4 the backend holds. */
  scanSubnet: boolean
}

export interface InstanceDiscovery {
  scan(scope: DiscoveryScope): Promise<DiscoveredInstance[]>
}
