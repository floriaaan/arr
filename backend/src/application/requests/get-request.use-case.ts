import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'

export interface GetRequestInput {
  id: string
}

export class GetRequest implements UseCase<GetRequestInput, MediaRequest | null> {
  constructor(private readonly repository: MediaRequestRepository) {}

  async execute(input: GetRequestInput): Promise<MediaRequest | null> {
    return this.repository.findById(input.id)
  }
}
