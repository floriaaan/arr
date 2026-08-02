import type { UseCase } from '#application/shared/use-case'
import type { MediaServerRepository } from '#domain/settings/interfaces/media-server-repository.interface'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export interface DeleteMediaServerInput {
  kind: MediaServerKind
}

export class DeleteMediaServer implements UseCase<DeleteMediaServerInput, void> {
  constructor(private readonly repository: MediaServerRepository) {}

  /** No-op when the kind isn't declared — deleting nothing is not an error. */
  async execute(input: DeleteMediaServerInput): Promise<void> {
    const existing = await this.repository.findByKind(input.kind)
    if (existing) await this.repository.delete(existing.id)
  }
}
