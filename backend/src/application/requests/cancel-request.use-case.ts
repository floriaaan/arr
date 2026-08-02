import { Result } from '#domain/shared/result'
import { canActOn } from './request-actor.js'
import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import type { EventBus } from '#application/shared/event-bus'
import type { RequestActor } from './request-actor.js'

export interface CancelRequestInput {
  id: string
  actor: RequestActor
}

export interface CancelRequestOutput {
  request: MediaRequest
  /**
   * `null` when the *arr acknowledged the cancellation. Reported rather than
   * logged here: use cases in this codebase return, callers log (same shape as
   * `ReconcileProgress`'s summary).
   */
  provisioningError: string | null
}

export type CancelRequestError = 'not_found' | 'forbidden' | InvalidTransition

export class CancelRequest implements UseCase<
  CancelRequestInput,
  Result<CancelRequestOutput, CancelRequestError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly clock: Clock,
    private readonly provisioning: MediaProvisioning,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    input: CancelRequestInput,
  ): Promise<Result<CancelRequestOutput, CancelRequestError>> {
    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')
    if (!canActOn(input.actor, request)) return Result.err('forbidden')

    const transition = request.cancel(this.clock.now())
    if (!transition.ok) return transition

    // Best-effort on purpose: the request belongs to *this* app, so an
    // unreachable *arr must not leave the user stuck with a request they
    // cannot cancel. Accepted cost: a desync the reconciler won't catch up on
    // (cf. docs/phase-6-fiabilite-requests, chantier 3 décision 3).
    const cancelled = await this.provisioning.cancel(request)

    await this.repository.save(request)
    await this.eventBus.publish(request.pullDomainEvents())
    return Result.ok({
      request,
      provisioningError: cancelled.ok ? null : cancelled.error.message,
    })
  }
}
