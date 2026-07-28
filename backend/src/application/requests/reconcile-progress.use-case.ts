import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type {
  DownloadProgress,
  ProgressSnapshot,
} from '#domain/requests/interfaces/download-progress.interface'
import type { Clock } from '#domain/shared/clock.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'

function refKey(ref: ExternalRef): string {
  return `${ref.instanceId}:${ref.remoteId}`
}

export interface ReconcileSummary {
  checked: number
  updated: number
}

/** Called by the Ace reconciler command every 10s while active requests exist (cf. docs/adr/0003). */
export class ReconcileProgress implements UseCase<void, ReconcileSummary> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly downloadProgress: DownloadProgress,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<ReconcileSummary> {
    const requests = await this.repository.findActiveWithExternalRef()
    if (requests.length === 0) return { checked: 0, updated: 0 }

    const refs = requests
      .map((request) => request.externalRef)
      .filter((ref): ref is ExternalRef => ref !== null)
    const snapshots = await this.downloadProgress.fetchProgress(refs)
    const snapshotsByKey = new Map(snapshots.map((snapshot) => [refKey(snapshot.ref), snapshot]))

    let updated = 0
    for (const request of requests) {
      if (!request.externalRef) continue

      const snapshot = snapshotsByKey.get(refKey(request.externalRef))
      if (!snapshot) continue

      const previousStatus = request.status
      this.applySnapshot(request, snapshot)
      if (request.status !== previousStatus) updated += 1
      await this.repository.save(request)
    }

    return { checked: requests.length, updated }
  }

  /**
   * Polling every 10s can miss an intermediate stage entirely (a fast
   * download can go submitted -> available between two ticks) — the
   * aggregate's transition methods only allow one step at a time, so a
   * "later" snapshot has to walk the request through whichever earlier
   * steps it skipped rather than being dropped for not matching a single
   * expected `request.status`.
   */
  private applySnapshot(request: MediaRequest, snapshot: ProgressSnapshot): void {
    const now = this.clock.now()

    if (snapshot.status === 'failed') {
      request.fail(snapshot.failureReason ?? 'Download failed', now)
      return
    }

    const wasSubmitted = request.status === 'submitted'
    if (wasSubmitted && this.statusOrder(snapshot.status) >= 1) {
      request.startDownloading(snapshot.progress ?? this.unknownDownloadProgress(), now)
    } else if (
      request.status === 'downloading' &&
      snapshot.status === 'downloading' &&
      snapshot.progress
    ) {
      request.updateProgress(snapshot.progress, now)
    }

    if (snapshot.status === 'downloading') return

    if (request.status === 'downloading' && this.statusOrder(snapshot.status) >= 2) {
      request.startImporting(now)
    }

    if (snapshot.status === 'available' && request.status === 'importing') {
      request.complete(now)
    }
  }

  /** Where a snapshot status sits in the one-way submitted -> ... -> available pipeline. */
  private statusOrder(status: ProgressSnapshot['status']): number {
    switch (status) {
      case 'downloading':
        return 1
      case 'importing':
        return 2
      case 'available':
        return 3
      default:
        return 0
    }
  }

  /** *arr reports "available" without a progress payload — nothing left to show, so this is discarded on completion. */
  private unknownDownloadProgress(): RequestProgress {
    const result = RequestProgress.create({
      percentage: 100,
      sizeLeftBytes: 0,
      eta: null,
      stepLabel: 'Imported',
    })
    if (!result.ok) throw new Error('unreachable: static 100% progress is always valid')
    return result.value
  }
}
