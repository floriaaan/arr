import { Result } from '#domain/shared/result'
import { canActOn } from './request-actor.js'
import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { RequestActor } from './request-actor.js'

export interface GetRequestInput {
  id: string
  actor: RequestActor
}

export type GetRequestError = 'not_found' | 'forbidden'

export class GetRequest implements UseCase<GetRequestInput, Result<MediaRequest, GetRequestError>> {
  constructor(private readonly repository: MediaRequestRepository) {}

  async execute(input: GetRequestInput): Promise<Result<MediaRequest, GetRequestError>> {
    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')
    if (!canActOn(input.actor, request)) return Result.err('forbidden')

    return Result.ok(request)
  }
}
