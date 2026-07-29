import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  QualityProfileRecord,
  ServarrQualityProfileManager,
} from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface UpdateQualityProfileInput {
  kind: ServarrKind
  id: number
  payload: QualityProfileRecord
}

export type UpdateQualityProfileError = ConnectionError | 'instance_not_found'

export class UpdateQualityProfile implements UseCase<
  UpdateQualityProfileInput,
  Result<QualityProfileRecord, UpdateQualityProfileError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: UpdateQualityProfileInput,
  ): Promise<Result<QualityProfileRecord, UpdateQualityProfileError>> {
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
