import type { DomainEvent } from '#domain/shared/domain-event'
import type { ServarrKind } from './servarr-kind.vo.js'
import type { ConnectionError } from './connection-error.vo.js'

export interface InstanceConnectedPayload {
  instanceId: string
  kind: ServarrKind
  detectedVersion: string
}

export function instanceConnected(
  payload: InstanceConnectedPayload,
  occurredAt: Date,
): DomainEvent<InstanceConnectedPayload> {
  return { name: 'InstanceConnected', occurredAt, payload }
}

export interface InstanceHealthCheckFailedPayload {
  instanceId: string
  kind: ServarrKind
  error: ConnectionError
}

export function instanceHealthCheckFailed(
  payload: InstanceHealthCheckFailedPayload,
  occurredAt: Date,
): DomainEvent<InstanceHealthCheckFailedPayload> {
  return { name: 'InstanceHealthCheckFailed', occurredAt, payload }
}

export interface OnboardingCompletedPayload {
  completedAt: Date
}

export function onboardingCompleted(
  payload: OnboardingCompletedPayload,
  occurredAt: Date,
): DomainEvent<OnboardingCompletedPayload> {
  return { name: 'OnboardingCompleted', occurredAt, payload }
}
