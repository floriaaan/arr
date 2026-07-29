import type { UseCase } from '#application/shared/use-case'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type {
  QualityProfileRecord,
  ServarrQualityProfileManager,
} from '#domain/settings/interfaces/servarr-quality-profile-manager.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export interface GetQualityProfileSchemaInput {
  kind: ServarrKind
}

export type GetQualityProfileSchemaError = ConnectionError | 'instance_not_found'

export class GetQualityProfileSchema implements UseCase<
  GetQualityProfileSchemaInput,
  Result<QualityProfileRecord, GetQualityProfileSchemaError>
> {
  constructor(
    private readonly instances: ServarrInstanceRepository,
    private readonly manager: ServarrQualityProfileManager,
  ) {}

  async execute(
    input: GetQualityProfileSchemaInput,
  ): Promise<Result<QualityProfileRecord, GetQualityProfileSchemaError>> {
    const instance = await this.instances.findByKind(input.kind)
    if (!instance) return Result.err('instance_not_found')

    return this.manager.getSchema(instance.kind, instance.baseUrl, instance.apiKey)
  }
}
