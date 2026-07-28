import type { UseCase } from '#application/shared/use-case'
import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import { type Result } from '#domain/shared/result'
import { ExternalId } from '#domain/catalog/external-id.vo'

export interface RemoveLibraryItemInput {
  scheme: ExternalIdScheme
  value: string
  deleteFiles: boolean
}

export class RemoveLibraryItem implements UseCase<
  RemoveLibraryItemInput,
  Result<void, ValidationError | ConnectionError>
> {
  constructor(private readonly library: MediaLibrary) {}

  async execute(
    input: RemoveLibraryItemInput,
  ): Promise<Result<void, ValidationError | ConnectionError>> {
    const externalId = ExternalId.create(input.scheme, input.value)
    if (!externalId.ok) return externalId

    return this.library.remove(externalId.value, input.deleteFiles)
  }
}
