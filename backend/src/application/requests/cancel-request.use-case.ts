import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import { Result } from '#domain/shared/result'

export interface CancelRequestInput {
  id: string
}

export type CancelRequestError = 'not_found' | InvalidTransition

export class CancelRequest implements UseCase<
  CancelRequestInput,
  Result<void, CancelRequestError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CancelRequestInput): Promise<Result<void, CancelRequestError>> {
    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')

    const result = request.cancel(this.clock.now())
    if (!result.ok) return result

    await this.repository.save(request)
    return Result.ok(undefined)
  }
}
