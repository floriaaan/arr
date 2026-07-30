import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  DownloadClientRecord,
  ServarrDownloadClientManager,
} from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface UpdateDownloadClientInput {
  kind: ServarrKind
  id: number
  payload: DownloadClientRecord
}

export type UpdateDownloadClientError = ConnectionError | 'instance_not_found'

export class UpdateDownloadClient implements UseCase<
  UpdateDownloadClientInput,
  Result<DownloadClientRecord, UpdateDownloadClientError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(
    input: UpdateDownloadClientInput,
  ): Promise<Result<DownloadClientRecord, UpdateDownloadClientError>> {
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
