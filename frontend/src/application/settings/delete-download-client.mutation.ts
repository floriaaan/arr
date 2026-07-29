import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export interface DeleteDownloadClientVariables {
  kind: ServarrKind
  id: number
}

export const deleteDownloadClientMutation = defineMutation<
  Result<void, ApiError>,
  DeleteDownloadClientVariables
>({
  mutationFn: (connector, { kind, id }) => connector.deleteDownloadClient(kind, id),
})

export function useDeleteDownloadClient() {
  return useDomainMutation(deleteDownloadClientMutation)
}
