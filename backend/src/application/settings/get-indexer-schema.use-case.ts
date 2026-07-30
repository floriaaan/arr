import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  IndexerRecord,
  ServarrIndexerManager,
} from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface GetIndexerSchemaInput {
  kind: ServarrKind
}

export type GetIndexerSchemaError = ConnectionError | 'instance_not_found'

export class GetIndexerSchema implements UseCase<
  GetIndexerSchemaInput,
  Result<IndexerRecord[], GetIndexerSchemaError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrIndexerManager,
  ) {}

  async execute(
    input: GetIndexerSchemaInput,
  ): Promise<Result<IndexerRecord[], GetIndexerSchemaError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.getSchema(instance.kind, instance.baseUrl, instance.apiKey)
  }
}
