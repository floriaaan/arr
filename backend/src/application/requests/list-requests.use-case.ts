import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { RequestFilter } from '#domain/requests/request-filter.vo'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'

export class ListRequests implements UseCase<RequestFilter, MediaRequest[]> {
  constructor(private readonly repository: MediaRequestRepository) {}

  async execute(filter: RequestFilter): Promise<MediaRequest[]> {
    return this.repository.findByFilter(filter)
  }
}
