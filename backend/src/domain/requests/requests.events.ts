import type { DomainEvent } from '#domain/shared/domain-event'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalRef } from './external-ref.vo.js'
import type { RequestProgress } from './request-progress.vo.js'

export interface MediaRequestedPayload {
  requestId: string
  kind: MediaKind
  externalId: string
}

export function mediaRequested(
  payload: MediaRequestedPayload,
  occurredAt: Date,
): DomainEvent<MediaRequestedPayload> {
  return { name: 'MediaRequested', occurredAt, payload }
}

export interface RequestSubmittedPayload {
  requestId: string
  externalRef: ExternalRef
}

export function requestSubmitted(
  payload: RequestSubmittedPayload,
  occurredAt: Date,
): DomainEvent<RequestSubmittedPayload> {
  return { name: 'RequestSubmitted', occurredAt, payload }
}

export interface RequestProgressedPayload {
  requestId: string
  progress: RequestProgress
}

export function requestProgressed(
  payload: RequestProgressedPayload,
  occurredAt: Date,
): DomainEvent<RequestProgressedPayload> {
  return { name: 'RequestProgressed', occurredAt, payload }
}

export interface RequestCompletedPayload {
  requestId: string
}

export function requestCompleted(
  payload: RequestCompletedPayload,
  occurredAt: Date,
): DomainEvent<RequestCompletedPayload> {
  return { name: 'RequestCompleted', occurredAt, payload }
}

export interface RequestFailedPayload {
  requestId: string
  reason: string
}

export function requestFailed(
  payload: RequestFailedPayload,
  occurredAt: Date,
): DomainEvent<RequestFailedPayload> {
  return { name: 'RequestFailed', occurredAt, payload }
}

export interface RequestCancelledPayload {
  requestId: string
}

export function requestCancelled(
  payload: RequestCancelledPayload,
  occurredAt: Date,
): DomainEvent<RequestCancelledPayload> {
  return { name: 'RequestCancelled', occurredAt, payload }
}

export interface RequestPendingApprovalPayload {
  requestId: string
}

export function requestPendingApproval(
  payload: RequestPendingApprovalPayload,
  occurredAt: Date,
): DomainEvent<RequestPendingApprovalPayload> {
  return { name: 'RequestPendingApproval', occurredAt, payload }
}
