import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type {
  DownloadProgress,
  ProgressSnapshot,
} from '#domain/requests/interfaces/download-progress.interface'
import type { Clock } from '#domain/shared/clock.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { ExternalRef } from '#domain/requests/external-ref.vo'

function refKey(ref: ExternalRef): string {
  return `${ref.instanceId}:${ref.remoteId}`
}

/** Called by the Ace reconciler command every 10s while active requests exist (cf. docs/adr/0003). */
export class ReconcileProgress implements UseCase<void, void> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly downloadProgress: DownloadProgress,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<void> {
    const requests = await this.repository.findActiveWithExternalRef()
    if (requests.length === 0) return

    const refs = requests
      .map((request) => request.externalRef)
      .filter((ref): ref is ExternalRef => ref !== null)
    const snapshots = await this.downloadProgress.fetchProgress(refs)
    const snapshotsByKey = new Map(snapshots.map((snapshot) => [refKey(snapshot.ref), snapshot]))

    for (const request of requests) {
      if (!request.externalRef) continue

      const snapshot = snapshotsByKey.get(refKey(request.externalRef))
      if (!snapshot) continue

      this.applySnapshot(request, snapshot)
      await this.repository.save(request)
    }
  }

  private applySnapshot(request: MediaRequest, snapshot: ProgressSnapshot): void {
    const now = this.clock.now()

    if (snapshot.status === 'downloading' && snapshot.progress) {
      if (request.status === 'submitted') {
        request.startDownloading(snapshot.progress, now)
      } else if (request.status === 'downloading') {
        request.updateProgress(snapshot.progress, now)
      }
      return
    }

    if (snapshot.status === 'importing' && request.status === 'downloading') {
      request.startImporting(now)
      return
    }

    if (snapshot.status === 'available' && request.status === 'importing') {
      request.complete(now)
      return
    }

    if (snapshot.status === 'failed') {
      request.fail(snapshot.failureReason ?? 'Download failed', now)
    }
  }
}
