import type { DomainEvent } from '#domain/shared/domain-event'

export interface UserRegisteredPayload {
  userId: string
  email: string
}

export function userRegistered(
  payload: UserRegisteredPayload,
  occurredAt: Date,
): DomainEvent<UserRegisteredPayload> {
  return { name: 'UserRegistered', occurredAt, payload }
}
