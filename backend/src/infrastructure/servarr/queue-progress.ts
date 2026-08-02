import { RequestProgress } from '#domain/requests/request-progress.vo'
import type { RequestStatus } from '#domain/requests/request-status.vo'

/**
 * The three *arr expose the same queue record shape for the fields that matter
 * here, and used to carry three byte-identical copies of this mapping. One
 * copy, so the aggregation rule below exists exactly once.
 */
const TRACKED_DOWNLOAD_STATE_TO_STATUS: Record<string, RequestStatus | undefined> = {
  downloading: 'downloading',
  importPending: 'importing',
  importing: 'importing',
  imported: 'available',
  failedPending: 'failed',
  failed: 'failed',
  /**
   * The download finished but the *arr couldn't import it on its own (e.g.
   * "Found matching movie via grab history, but release was matched to
   * movie by ID. Manual Import required.") — it needs a human in the *arr's
   * own Manual Import screen, and will otherwise sit there forever. Treated
   * as a failure so it surfaces a reason instead of freezing at "importing".
   */
  importBlocked: 'failed',
}

/** Structural minimum shared by Radarr/Sonarr/Lidarr queue records. */
export interface QueueRecordLike {
  size?: number
  sizeleft?: number
  status: string
  trackedDownloadState?: string
  errorMessage?: string | null
  statusMessages?: Array<{ messages?: string[] }>
  estimatedCompletionTime?: string | null
}

export interface QueueProgress {
  status: RequestStatus | null
  progress: RequestProgress | null
  failureReason: string | null
}

function failureReasonOf(record: QueueRecordLike): string {
  return (
    record.errorMessage ??
    record.statusMessages?.flatMap((message) => message.messages ?? []).join('; ') ??
    'Download failed'
  )
}

function statusOf(record: QueueRecordLike): RequestStatus | null {
  const mapped = record.trackedDownloadState
    ? TRACKED_DOWNLOAD_STATE_TO_STATUS[record.trackedDownloadState]
    : undefined
  if (mapped) return mapped
  if (record.status === 'failed') return 'failed'
  if (record.status === 'downloading') return 'downloading'
  return null
}

function percentageOf(size: number, sizeLeft: number): number {
  return size > 0 ? Math.min(100, Math.round(((size - sizeLeft) / size) * 100)) : 0
}

/** One queue record — one file. Used as-is by Radarr, where that's the whole story. */
export function toQueueProgress(record: QueueRecordLike): QueueProgress {
  const status = statusOf(record)
  const size = record.size ?? 0
  const sizeLeft = record.sizeleft ?? 0

  const progress = RequestProgress.create({
    percentage: percentageOf(size, sizeLeft),
    sizeLeftBytes: sizeLeft,
    eta: record.estimatedCompletionTime ? new Date(record.estimatedCompletionTime) : null,
    stepLabel: record.trackedDownloadState ?? record.status,
  })

  return {
    status,
    progress: progress.ok ? progress.value : null,
    failureReason: status === 'failed' ? failureReasonOf(record) : null,
  }
}

/**
 * A Sonarr series (or a Lidarr album) has *many* queue records — one per
 * episode/track. The rule, cf. docs/phase-6-fiabilite-requests chantier 4:
 *
 * - one record in failure → the whole request fails, immediately, without
 *   waiting for the others;
 * - otherwise, still in progress, with the percentage summed over every record
 *   rather than read off an arbitrary one;
 * - `available` is **never** decided here. Every record being imported only
 *   means the queue is empty of them, not that every episode of the series has
 *   a file — that call belongs to the file counts, so this returns `null` and
 *   lets the caller check.
 */
export function aggregateQueueProgress(records: QueueRecordLike[]): QueueProgress {
  if (records.length === 0) return { status: null, progress: null, failureReason: null }

  const failed = records.find((record) => statusOf(record) === 'failed')
  if (failed) {
    return { status: 'failed', progress: null, failureReason: failureReasonOf(failed) }
  }

  const active = records.filter((record) => {
    const status = statusOf(record)
    return status === 'downloading' || status === 'importing'
  })
  if (active.length === 0) return { status: null, progress: null, failureReason: null }

  const size = records.reduce((total, record) => total + (record.size ?? 0), 0)
  const sizeLeft = records.reduce((total, record) => total + (record.sizeleft ?? 0), 0)

  // The series is done when its *last* episode is, so the furthest ETA wins.
  const etas = records
    .map((record) => record.estimatedCompletionTime)
    .filter((eta): eta is string => Boolean(eta))
    .map((eta) => new Date(eta).getTime())
  const eta = etas.length > 0 ? new Date(Math.max(...etas)) : null

  // Importing outranks downloading: once anything is importing, that's the
  // step the user is waiting on.
  const importing = active.some((record) => statusOf(record) === 'importing')
  const reference = active[0]

  const progress = RequestProgress.create({
    percentage: percentageOf(size, sizeLeft),
    sizeLeftBytes: sizeLeft,
    eta,
    stepLabel: reference?.trackedDownloadState ?? reference?.status ?? '',
  })

  return {
    status: importing ? 'importing' : 'downloading',
    progress: progress.ok ? progress.value : null,
    failureReason: null,
  }
}
