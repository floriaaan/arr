import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { IndexerRecord } from '#domain/settings/indexer-record'

export interface UpdateIndexerVariables {
  kind: ServarrKind
  id: number
  payload: IndexerRecord
}

export const updateIndexerMutation = defineMutation<
  Result<IndexerRecord, ApiError>,
  UpdateIndexerVariables
>({
  mutationFn: (connector, { kind, id, payload }) => connector.updateIndexer(kind, id, payload),
})

export function useUpdateIndexer() {
  return useDomainMutation(updateIndexerMutation)
}
