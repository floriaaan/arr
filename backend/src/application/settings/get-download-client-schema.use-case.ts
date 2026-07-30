import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface GetDownloadClientSchemaInput {
  kind: ServarrKind
}

export type GetDownloadClientSchemaError = ConnectionError | 'instance_not_found'

export class GetDownloadClientSchema implements UseCase<
  GetDownloadClientSchemaInput,
  Result<DownloadClientRecord[], GetDownloadClientSchemaError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(
    input: GetDownloadClientSchemaInput,
  ): Promise<Result<DownloadClientRecord[], GetDownloadClientSchemaError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.getSchema(instance.kind, instance.baseUrl, instance.apiKey)
  }
}
