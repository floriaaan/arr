import { type ServarrRegistry } from './servarr-registry.js'
import type {
  DownloadProgress,
  ProgressSnapshot,
} from '#domain/requests/interfaces/download-progress.interface'
import type { ExternalRef } from '#domain/requests/external-ref.vo'

export class ServarrDownloadProgress implements DownloadProgress {
  constructor(private readonly registry: ServarrRegistry) {}

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const refsByInstanceId = new Map<string, ExternalRef[]>()
    for (const ref of refs) {
      const list = refsByInstanceId.get(ref.instanceId) ?? []
      list.push(ref)
      refsByInstanceId.set(ref.instanceId, list)
    }

    const snapshots: ProgressSnapshot[] = []
    for (const [instanceId, instanceRefs] of refsByInstanceId) {
      const adapter = await this.registry.resolveByInstanceId(instanceId)
      if (!adapter) continue
      snapshots.push(...(await adapter.fetchProgress(instanceRefs)))
    }
    return snapshots
  }
}
