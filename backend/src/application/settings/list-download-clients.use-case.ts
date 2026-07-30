import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface ListDownloadClientsInput {
  kind: ServarrKind
}

export type ListDownloadClientsError = ConnectionError | 'instance_not_found'

export class ListDownloadClients implements UseCase<
  ListDownloadClientsInput,
  Result<DownloadClientRecord[], ListDownloadClientsError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(
    input: ListDownloadClientsInput,
  ): Promise<Result<DownloadClientRecord[], ListDownloadClientsError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.list(instance.kind, instance.baseUrl, instance.apiKey)
  }
}
