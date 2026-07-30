import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  IndexerRecord,
  ServarrIndexerManager,
} from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface UpdateIndexerInput {
  kind: ServarrKind
  id: number
  payload: IndexerRecord
}

export type UpdateIndexerError = ConnectionError | 'instance_not_found'

export class UpdateIndexer implements UseCase<
  UpdateIndexerInput,
  Result<IndexerRecord, UpdateIndexerError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrIndexerManager,
  ) {}

  async execute(input: UpdateIndexerInput): Promise<Result<IndexerRecord, UpdateIndexerError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.update(
      instance.kind,
      instance.baseUrl,
      instance.apiKey,
      input.id,
      input.payload,
    )
  }
}
