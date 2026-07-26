import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'

export class ListInstances implements UseCase<void, ServarrInstance[]> {
  constructor(private readonly repository: ServarrInstanceRepository) {}

  async execute(): Promise<ServarrInstance[]> {
    return this.repository.findAll()
  }
}
