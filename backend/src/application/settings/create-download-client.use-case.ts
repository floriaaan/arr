import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface CreateDownloadClientInput {
  kind: ServarrKind
  payload: DownloadClientRecord
}

export type CreateDownloadClientError = ConnectionError | 'instance_not_found'

/** Pure passthrough to the *arr — there is no local representation to keep in sync (decision 1). */
export class CreateDownloadClient implements UseCase<
  CreateDownloadClientInput,
  Result<DownloadClientRecord, CreateDownloadClientError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(
    input: CreateDownloadClientInput,
  ): Promise<Result<DownloadClientRecord, CreateDownloadClientError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.create(instance.kind, instance.baseUrl, instance.apiKey, input.payload)
  }
}
