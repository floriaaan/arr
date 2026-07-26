import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'

export interface DeleteInstanceInput {
  id: string
}

export class DeleteInstance implements UseCase<DeleteInstanceInput, void> {
  constructor(private readonly repository: ServarrInstanceRepository) {}

  async execute(input: DeleteInstanceInput): Promise<void> {
    await this.repository.delete(input.id)
  }
}
