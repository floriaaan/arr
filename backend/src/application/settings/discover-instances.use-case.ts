import type { UseCase } from '#application/shared/use-case'
import type { InstanceDiscovery } from '#domain/settings/interfaces/instance-discovery.interface'
import type { DiscoveredInstance } from '#domain/settings/discovered-instance.vo'

export interface DiscoverInstancesInput {
  extraHost?: string
  scanSubnet: boolean
}

/**
 * Read-only and stateless: a scan only ever proposes base URLs to pre-fill a
 * form, it never writes an instance (cf. docs/phase-5-quality-of-life/01,
 * décision 8).
 */
export class DiscoverInstances implements UseCase<DiscoverInstancesInput, DiscoveredInstance[]> {
  constructor(private readonly discovery: InstanceDiscovery) {}

  async execute(input: DiscoverInstancesInput): Promise<DiscoveredInstance[]> {
    return this.discovery.scan({
      extraHost: input.extraHost?.trim() ? input.extraHost.trim() : null,
      scanSubnet: input.scanSubnet,
    })
  }
}
