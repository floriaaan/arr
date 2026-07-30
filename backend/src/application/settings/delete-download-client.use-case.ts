import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrDownloadClientManager } from '#domain/settings/interfaces/servarr-download-client-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface DeleteDownloadClientInput {
  kind: ServarrKind
  id: number
}

export type DeleteDownloadClientError = ConnectionError | 'instance_not_found'

export class DeleteDownloadClient implements UseCase<
  DeleteDownloadClientInput,
  Result<void, DeleteDownloadClientError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrDownloadClientManager,
  ) {}

  async execute(
    input: DeleteDownloadClientInput,
  ): Promise<Result<void, DeleteDownloadClientError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.delete(instance.kind, instance.baseUrl, instance.apiKey, input.id)
  }
}
