import type { UseCase } from '#application/shared/use-case'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'
import type { ValidationError } from '#domain/shared/validation-error'
import { Result } from '#domain/shared/result'
import { ExternalId } from '#domain/catalog/external-id.vo'

export interface GetMediaDetailInput {
  scheme: ExternalIdScheme
  value: string
}

export class GetMediaDetail implements UseCase<
  GetMediaDetailInput,
  Result<MediaDetail, ValidationError>
> {
  constructor(private readonly lookup: MediaLookup) {}

  async execute(input: GetMediaDetailInput): Promise<Result<MediaDetail, ValidationError>> {
    const externalId = ExternalId.create(input.scheme, input.value)
    if (!externalId.ok) return externalId

    return Result.ok(await this.lookup.detail(externalId.value))
  }
}
