import type { DiscoverableKind } from '#domain/settings/discovered-instance.vo'
import type { DiscoveryScope } from '#domain/settings/interfaces/instance-discovery.interface'

/**
 * How a candidate is identified once its port answers. Jellyfin and Emby
 * share port 8096 *and* the same legacy `/System/Info/Public` route, so they
 * can't be told apart before the probe — hence a family rather than a kind.
 */
export type ProbeFamily = 'servarr' | 'plex' | 'jellyfin-emby'

export interface ProbeTarget {
  port: number
  family: ProbeFamily
  /** Used as-is when the service refuses to identify itself (`confidence: 'port'`). */
  expectedKind: DiscoverableKind
}

/**
 * Only plain HTTP ports. Jellyfin/Emby also listen on 8920 over HTTPS, but
 * that port almost always carries a self-signed certificate, and skipping
 * verification to reach it is not a trade this app makes — such a server
 * simply isn't discovered (cf. docs/phase-5-quality-of-life/01).
 */
export const PROBE_TARGETS: readonly ProbeTarget[] = [
  { port: 7878, family: 'servarr', expectedKind: 'radarr' },
  { port: 8989, family: 'servarr', expectedKind: 'sonarr' },
  { port: 8686, family: 'servarr', expectedKind: 'lidarr' },
  { port: 32400, family: 'plex', expectedKind: 'plex' },
  { port: 8096, family: 'jellyfin-emby', expectedKind: 'jellyfin' },
]

/**
 * Hosts that could be running anything — every target is worth trying.
 * `127.0.0.1` alongside `localhost` on purpose: on some setups `localhost`
 * resolves to `::1` only, and an IPv4-bound service would be missed.
 */
const GENERIC_HOSTS = ['localhost', '127.0.0.1', 'host.docker.internal'] as const

/**
 * Compose service names: on a shared `compose.yml` network, `http://radarr:7878`
 * is the canonical address. Probing `radarr` for Plex's port would just burn a
 * DNS lookup, so each name only gets its own target.
 */
const SERVICE_HOSTS: Record<string, DiscoverableKind> = {
  radarr: 'radarr',
  sonarr: 'sonarr',
  lidarr: 'lidarr',
  plex: 'plex',
  jellyfin: 'jellyfin',
  emby: 'emby',
}

export interface Candidate {
  host: string
  port: number
  family: ProbeFamily
  expectedKind: DiscoverableKind
}

function targetsForKind(kind: DiscoverableKind): ProbeTarget[] {
  // Emby has no target of its own — it shares Jellyfin's 8096 entry.
  if (kind === 'emby') {
    return PROBE_TARGETS.filter((target) => target.family === 'jellyfin-emby').map((target) => ({
      ...target,
      expectedKind: 'emby',
    }))
  }
  return PROBE_TARGETS.filter((target) => target.expectedKind === kind)
}

/**
 * Users paste what they have: `nas.local`, `192.168.1.50:8096`,
 * `http://192.168.1.50:8096/web`. Only the host survives — the ports come
 * from `PROBE_TARGETS`, since the point of a scan is to find them.
 */
export function normalizeHost(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const host = withoutScheme.split('/')[0]?.split(':')[0]?.trim() ?? ''

  // Anything with whitespace or a path separator left in it isn't a host.
  return host !== '' && !/\s/.test(host) ? host : null
}

/** `192.168.1.42` -> `192.168.1.1 … 192.168.1.254`, minus the address itself. */
function subnetHosts(ipv4: string): string[] {
  const octets = ipv4.split('.')
  if (octets.length !== 4) return []
  const prefix = octets.slice(0, 3).join('.')
  const own = Number(octets[3])

  const hosts: string[] = []
  for (let last = 1; last <= 254; last++) {
    if (last !== own) hosts.push(`${prefix}.${last}`)
  }
  return hosts
}

/**
 * Pure on purpose — the local IPv4 list is passed in rather than read from
 * `node:os`, so the candidate maths can be tested without a network.
 * Deduplicated by `host:port`, since a `/24` sweep will naturally re-emit
 * hosts already covered by the well-known list.
 */
export function buildCandidates(scope: DiscoveryScope, localIpv4s: string[]): Candidate[] {
  const byHostPort = new Map<string, Candidate>()

  function add(host: string, targets: readonly ProbeTarget[]): void {
    for (const target of targets) {
      const key = `${host}:${target.port}`
      if (byHostPort.has(key)) continue
      byHostPort.set(key, {
        host,
        port: target.port,
        family: target.family,
        expectedKind: target.expectedKind,
      })
    }
  }

  for (const host of GENERIC_HOSTS) add(host, PROBE_TARGETS)
  for (const [host, kind] of Object.entries(SERVICE_HOSTS)) add(host, targetsForKind(kind))

  const extraHost = scope.extraHost ? normalizeHost(scope.extraHost) : null
  if (extraHost) add(extraHost, PROBE_TARGETS)

  if (scope.scanSubnet) {
    for (const ipv4 of localIpv4s) {
      for (const host of subnetHosts(ipv4)) add(host, PROBE_TARGETS)
    }
  }

  return [...byHostPort.values()]
}
