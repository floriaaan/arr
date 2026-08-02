import { Result } from '#domain/shared/result'
import { canActOn } from './request-actor.js'
import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { RequestEpisodes } from '#domain/requests/interfaces/request-episodes.interface'
import type { RequestEpisode } from '#domain/requests/request-episode.entity'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import type { RequestActor } from './request-actor.js'

export interface ListRequestEpisodesInput {
  id: string
  actor: RequestActor
}

export type ListRequestEpisodesError = 'not_found' | 'forbidden' | ProvisioningError

/** Same ownership rule as `GetRequest` — unfolding a request is reading it. */
export class ListRequestEpisodes implements UseCase<
  ListRequestEpisodesInput,
  Result<RequestEpisode[], ListRequestEpisodesError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly episodes: RequestEpisodes,
  ) {}

  async execute(
    input: ListRequestEpisodesInput,
  ): Promise<Result<RequestEpisode[], ListRequestEpisodesError>> {
    const request = await this.repository.findById(input.id)
    if (!request) return Result.err('not_found')
    if (!canActOn(input.actor, request)) return Result.err('forbidden')

    return this.episodes.list(request)
  }
}
