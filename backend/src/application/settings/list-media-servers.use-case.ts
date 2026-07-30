import type { UseCase } from '#application/shared/use-case'
import type { MediaServerRepository } from '#domain/settings/interfaces/media-server-repository.interface'
import type { MediaServer } from '#domain/settings/media-server.aggregate'

export class ListMediaServers implements UseCase<void, MediaServer[]> {
  constructor(private readonly repository: MediaServerRepository) {}

  async execute(): Promise<MediaServer[]> {
    return this.repository.findAll()
  }
}
