import net from 'node:net'
import os from 'node:os'
import { buildCandidates } from './candidates.js'
import { probe } from './probes.js'
import type { Candidate } from './candidates.js'
import type { DiscoveredInstance } from '#domain/settings/discovered-instance.vo'
import type {
  DiscoveryScope,
  InstanceDiscovery,
} from '#domain/settings/interfaces/instance-discovery.interface'

const TCP_TIMEOUT_MS = 300
const CONCURRENCY = 64
/** A sweep that outlives this simply returns what it already found. */
const TOTAL_BUDGET_MS = 20_000

/** Local IPv4s of every non-loopback, non-internal interface. */
function localIpv4s(): string[] {
  return Object.values(os.networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address)
}

/**
 * A raw TCP connect, used to skip the ~99% of a `/24` sweep that has nothing
 * listening: it fails in milliseconds on a closed port, where an HTTP request
 * would pay DNS, connection and read timeouts before giving up.
 */
function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const settle = (open: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(open)
    }

    socket.setTimeout(TCP_TIMEOUT_MS)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
    socket.connect(port, host)
  })
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      if (item === undefined) continue
      results.push(await worker(item))
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

export class NetworkInstanceDiscovery implements InstanceDiscovery {
  async scan(scope: DiscoveryScope): Promise<DiscoveredInstance[]> {
    const candidates = buildCandidates(scope, localIpv4s())
    const deadline = Date.now() + TOTAL_BUDGET_MS

    const found = await mapWithConcurrency(
      candidates,
      CONCURRENCY,
      async (candidate: Candidate): Promise<DiscoveredInstance | null> => {
        if (Date.now() > deadline) return null
        if (!(await isPortOpen(candidate.host, candidate.port))) return null
        return probe(candidate)
      },
    )

    const byUrl = new Map<string, DiscoveredInstance>()
    for (const instance of found) {
      if (instance) byUrl.set(`${instance.kind}:${instance.baseUrl}`, instance)
    }

    return [...byUrl.values()].sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.baseUrl.localeCompare(b.baseUrl),
    )
  }
}
