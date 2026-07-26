import type { ExternalRef } from '../external-ref.vo.js'
import type { RequestStatus } from '../request-status.vo.js'
import type { RequestProgress } from '../request-progress.vo.js'

export interface ProgressSnapshot {
  ref: ExternalRef
  status: RequestStatus
  progress?: RequestProgress
  failureReason?: string
}

/**
 * Polling today (cf. docs/adr/0003-reconciliation-progression.md); designed
 * so an SSE-backed implementation could replace it later without touching
 * ReconcileProgress or the domain.
 */
export interface DownloadProgress {
  fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]>
}
