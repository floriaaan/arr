import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  IndexerRecord,
  ServarrIndexerManager,
} from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface CreateIndexerInput {
  kind: ServarrKind
  payload: IndexerRecord
}

export type CreateIndexerError = ConnectionError | 'instance_not_found'

/** Pure passthrough to the *arr — there is no local representation to keep in sync (decision 1). */
export class CreateIndexer implements UseCase<
  CreateIndexerInput,
  Result<IndexerRecord, CreateIndexerError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrIndexerManager,
  ) {}

  async execute(input: CreateIndexerInput): Promise<Result<IndexerRecord, CreateIndexerError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.create(instance.kind, instance.baseUrl, instance.apiKey, input.payload)
  }
}
