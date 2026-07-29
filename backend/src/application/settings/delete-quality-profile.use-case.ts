import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrQualityProfileManager } from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface DeleteQualityProfileInput {
  kind: ServarrKind
  id: number
}

export type DeleteQualityProfileError = ConnectionError | 'instance_not_found'

export class DeleteQualityProfile implements UseCase<
  DeleteQualityProfileInput,
  Result<void, DeleteQualityProfileError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: DeleteQualityProfileInput,
  ): Promise<Result<void, DeleteQualityProfileError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.delete(instance.kind, instance.baseUrl, instance.apiKey, input.id)
  }
}
