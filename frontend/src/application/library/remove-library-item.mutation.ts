import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ExternalId } from '#domain/catalog/external-id'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface RemoveLibraryItemVariables {
  externalId: ExternalId
  deleteFiles: boolean
}

export const removeLibraryItemMutation = defineMutation<
  Result<void, ApiError>,
  RemoveLibraryItemVariables
>({
  mutationFn: (connector, { externalId, deleteFiles }) =>
    connector.removeLibraryItem(externalId, deleteFiles),
})

export function useRemoveLibraryItem() {
  return useDomainMutation(removeLibraryItemMutation)
}
