import { AggregateRoot } from '#domain/shared/aggregate-root'
import { Result } from '#domain/shared/result'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { RequestStatus } from './request-status.vo.js'
import type { RequestProgress } from './request-progress.vo.js'
import type { ExternalRef } from './external-ref.vo.js'
import {
  mediaRequested,
  requestSubmitted,
  requestProgressed,
  requestCompleted,
  requestFailed,
  requestCancelled,
} from './requests.events.js'

const ACTIVE_STATUSES: RequestStatus[] = ['pending', 'submitted', 'downloading', 'importing']
const CANCELLABLE_STATUSES: RequestStatus[] = ['pending', 'submitted', 'downloading']

export interface MediaRequestProps {
  requestedBy: string
  kind: MediaKind
  externalId: ExternalId
  title: string
  instanceId: string
  externalRef: ExternalRef | null
  status: RequestStatus
  progress: RequestProgress | null
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RequestMediaInput {
  requestedBy: string
  kind: MediaKind
  externalId: ExternalId
  title: string
  instanceId: string
}

export class MediaRequest extends AggregateRoot<string> {
  private props: MediaRequestProps

  private constructor(id: string, props: MediaRequestProps) {
    super(id)
    this.props = props
  }

  static request(id: string, input: RequestMediaInput, now: Date): MediaRequest {
    const request = new MediaRequest(id, {
      requestedBy: input.requestedBy,
      kind: input.kind,
      externalId: input.externalId,
      title: input.title,
      instanceId: input.instanceId,
      externalRef: null,
      status: 'pending',
      progress: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    })
    request.record(
      mediaRequested(
        { requestId: id, kind: input.kind, externalId: input.externalId.format() },
        now,
      ),
    )
    return request
  }

  /** Used by the persistence mapper to rehydrate an already-valid aggregate. */
  static reconstruct(id: string, props: MediaRequestProps): MediaRequest {
    return new MediaRequest(id, props)
  }

  get requestedBy(): string {
    return this.props.requestedBy
  }

  get kind(): MediaKind {
    return this.props.kind
  }

  get externalId(): ExternalId {
    return this.props.externalId
  }

  get title(): string {
    return this.props.title
  }

  get instanceId(): string {
    return this.props.instanceId
  }

  get externalRef(): ExternalRef | null {
    return this.props.externalRef
  }

  get status(): RequestStatus {
    return this.props.status
  }

  get progress(): RequestProgress | null {
    return this.props.progress
  }

  get failureReason(): string | null {
    return this.props.failureReason
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  submit(ref: ExternalRef, now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'pending') {
      return Result.err({ from: this.props.status, to: 'submitted' })
    }
    this.props.externalRef = ref
    this.props.status = 'submitted'
    this.props.updatedAt = now
    this.record(requestSubmitted({ requestId: this.id, externalRef: ref }, now))
    return Result.ok(undefined)
  }

  startDownloading(progress: RequestProgress, now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'submitted') {
      return Result.err({ from: this.props.status, to: 'downloading' })
    }
    this.props.status = 'downloading'
    this.props.progress = progress
    this.props.updatedAt = now
    this.record(requestProgressed({ requestId: this.id, progress }, now))
    return Result.ok(undefined)
  }

  /** Valid only while already `downloading` — use startDownloading() for the Submitted -> Downloading move. */
  updateProgress(progress: RequestProgress, now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'downloading') {
      return Result.err({ from: this.props.status, to: 'downloading' })
    }
    this.props.progress = progress
    this.props.updatedAt = now
    this.record(requestProgressed({ requestId: this.id, progress }, now))
    return Result.ok(undefined)
  }

  startImporting(now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'downloading') {
      return Result.err({ from: this.props.status, to: 'importing' })
    }
    this.props.status = 'importing'
    this.props.updatedAt = now
    return Result.ok(undefined)
  }

  complete(now: Date): Result<void, InvalidTransition> {
    if (this.props.status !== 'importing') {
      return Result.err({ from: this.props.status, to: 'available' })
    }
    this.props.status = 'available'
    this.props.progress = null
    this.props.updatedAt = now
    this.record(requestCompleted({ requestId: this.id }, now))
    return Result.ok(undefined)
  }

  /** Allowed from any active state — a terminal request (available/failed/cancelled) cannot fail again. */
  fail(reason: string, now: Date): Result<void, InvalidTransition> {
    if (!ACTIVE_STATUSES.includes(this.props.status)) {
      return Result.err({ from: this.props.status, to: 'failed' })
    }
    this.props.status = 'failed'
    this.props.failureReason = reason
    this.props.updatedAt = now
    this.record(requestFailed({ requestId: this.id, reason }, now))
    return Result.ok(undefined)
  }

  /** Not allowed from importing/available — too late to cancel a request that's already landing. */
  cancel(now: Date): Result<void, InvalidTransition> {
    if (!CANCELLABLE_STATUSES.includes(this.props.status)) {
      return Result.err({ from: this.props.status, to: 'cancelled' })
    }
    this.props.status = 'cancelled'
    this.props.updatedAt = now
    this.record(requestCancelled({ requestId: this.id }, now))
    return Result.ok(undefined)
  }
}
