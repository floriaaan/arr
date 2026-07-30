import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export interface DeleteIndexerVariables {
  kind: ServarrKind
  id: number
}

export const deleteIndexerMutation = defineMutation<Result<void, ApiError>, DeleteIndexerVariables>(
  {
    mutationFn: (connector, { kind, id }) => connector.deleteIndexer(kind, id),
  },
)

export function useDeleteIndexer() {
  return useDomainMutation(deleteIndexerMutation)
}
