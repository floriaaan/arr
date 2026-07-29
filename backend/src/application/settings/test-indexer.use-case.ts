import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  IndexerRecord,
  ServarrIndexerManager,
} from '#domain/settings/interfaces/servarr-indexer-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface TestIndexerInput {
  kind: ServarrKind
  payload: IndexerRecord
}

export type TestIndexerError = ConnectionError | 'instance_not_found'

export class TestIndexer implements UseCase<TestIndexerInput, Result<void, TestIndexerError>> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrIndexerManager,
  ) {}

  async execute(input: TestIndexerInput): Promise<Result<void, TestIndexerError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.test(instance.kind, instance.baseUrl, instance.apiKey, input.payload)
  }
}
