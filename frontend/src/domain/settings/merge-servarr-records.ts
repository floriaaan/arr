import type { ServarrKind } from './servarr-instance'

export interface MergedRecord<T> {
  mergeKey: string
  name: string
  implementation: string
  protocol: string
  perInstance: Array<{ kind: ServarrKind; record: T }>
}

const KIND_ORDER: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

/**
 * Display-only grouping heuristic (cf. docs/phase-4-download-clients-indexers
 * decision 3): two records from different kinds are treated as "the same"
 * download client/indexer if they share an implementation, protocol, and a
 * normalized name — dynamic connection fields (host/baseUrl/…) are not
 * compared, since they vary too much per implementation for reliable MVP
 * matching.
 */
export function computeMergeKey(implementation: string, protocol: string, name: string): string {
  return [implementation, protocol, name].map((part) => part.trim().toLowerCase()).join('::')
}

/**
 * Groups records fetched per-kind into merged cards. Order within each
 * `perInstance` list follows `KIND_ORDER` (radarr → sonarr → lidarr) so
 * callers can rely on `perInstance[0]` as the "reference instance" for a
 * grouped edit (cf. decision 4).
 */
export function mergeByInstance<
  T extends { implementation: string; protocol: string; name: string },
>(entries: Array<{ kind: ServarrKind; records: T[] }>): MergedRecord<T>[] {
  const byKey = new Map<string, MergedRecord<T>>()

  const ordered = [...entries].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  )

  for (const { kind, records } of ordered) {
    for (const record of records) {
      const key = computeMergeKey(record.implementation, record.protocol, record.name)
      const existing = byKey.get(key)
      if (existing) {
        existing.perInstance.push({ kind, record })
      } else {
        byKey.set(key, {
          mergeKey: key,
          name: record.name,
          implementation: record.implementation,
          protocol: record.protocol,
          perInstance: [{ kind, record }],
        })
      }
    }
  }

  return [...byKey.values()]
}
