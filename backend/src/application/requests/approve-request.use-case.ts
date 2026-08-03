import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import type { EventBus } from '#application/shared/event-bus'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import type { RequestActor } from './request-actor.js'

export interface ApproveRequestInput {
  id: string
  actor: RequestActor
}

export type ApproveRequestError = 'not_found' | 'forbidden' | InvalidTransition | ProvisioningError

/**
 * Admin-only, unlike `canActOn` (which also lets the requester act on their
 * own request) — approving is a distinct trust boundary from cancelling
 * (cf. docs/phase-7-watchlist-sync, chantier 4 décision 4).
 */
export class ApproveRequest implements UseCase<
  ApproveRequestInput,
  Result<MediaRequest, ApproveRequestError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly provisioning: MediaProvisioning,
    private readonly clock: Clock,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ApproveRequestInput): Promise<Result<MediaRequest, ApproveRequestError>> {
    if (!input.actor.isAdmin) return Result.err('forbidden')

    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')

    const approved = request.approve(input.actor.id, this.clock.now())
    if (!approved.ok) return approved

    // Same submit-or-fail shape as `CreateRequest` — approval is the same
    // "hand it to the *arr" step, just delayed until now.
    const provisioned = await this.provisioning.submit(request)
    if (!provisioned.ok) {
      request.fail(provisioned.error.message, this.clock.now())
      await this.repository.save(request)
      await this.eventBus.publish(request.pullDomainEvents())
      return provisioned
    }

    request.submit(provisioned.value, this.clock.now())
    await this.repository.save(request)
    await this.eventBus.publish(request.pullDomainEvents())
    return Result.ok(request)
  }
}
