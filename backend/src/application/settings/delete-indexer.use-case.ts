import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrIndexerManager } from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface DeleteIndexerInput {
  kind: ServarrKind
  id: number
}

export type DeleteIndexerError = ConnectionError | 'instance_not_found'

export class DeleteIndexer implements UseCase<
  DeleteIndexerInput,
  Result<void, DeleteIndexerError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrIndexerManager,
  ) {}

  async execute(input: DeleteIndexerInput): Promise<Result<void, DeleteIndexerError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.delete(instance.kind, instance.baseUrl, instance.apiKey, input.id)
  }
}
