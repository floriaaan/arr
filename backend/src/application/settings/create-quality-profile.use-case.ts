import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  QualityProfileRecord,
  ServarrQualityProfileManager,
} from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface CreateQualityProfileInput {
  kind: ServarrKind
  payload: QualityProfileRecord
}

export type CreateQualityProfileError = ConnectionError | 'instance_not_found'

export class CreateQualityProfile implements UseCase<
  CreateQualityProfileInput,
  Result<QualityProfileRecord, CreateQualityProfileError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: CreateQualityProfileInput,
  ): Promise<Result<QualityProfileRecord, CreateQualityProfileError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.create(instance.kind, instance.baseUrl, instance.apiKey, input.payload)
  }
}
