import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import type { EventBus } from '#application/shared/event-bus'
import type { RequestActor } from './request-actor.js'

export interface RejectRequestInput {
  id: string
  actor: RequestActor
  reason: string
}

export type RejectRequestError = 'not_found' | 'forbidden' | InvalidTransition

/** Admin-only, same reasoning as `ApproveRequest`. */
export class RejectRequest implements UseCase<
  RejectRequestInput,
  Result<MediaRequest, RejectRequestError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly clock: Clock,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: RejectRequestInput): Promise<Result<MediaRequest, RejectRequestError>> {
    if (!input.actor.isAdmin) return Result.err('forbidden')

    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')

    const rejected = request.reject(input.reason, this.clock.now())
    if (!rejected.ok) return rejected

    await this.repository.save(request)
    await this.eventBus.publish(request.pullDomainEvents())
    return Result.ok(request)
  }
}
