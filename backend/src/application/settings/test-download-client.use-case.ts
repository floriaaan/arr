import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface TestDownloadClientInput {
  kind: ServarrKind
  payload: DownloadClientRecord
}

export type TestDownloadClientError = ConnectionError | 'instance_not_found'

export class TestDownloadClient implements UseCase<
  TestDownloadClientInput,
  Result<void, TestDownloadClientError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(input: TestDownloadClientInput): Promise<Result<void, TestDownloadClientError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.test(instance.kind, instance.baseUrl, instance.apiKey, input.payload)
  }
}
