import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { IndexerRecord } from '#domain/settings/indexer-record'

export interface CreateIndexerVariables {
  kind: ServarrKind
  payload: IndexerRecord
}

export const createIndexerMutation = defineMutation<
  Result<IndexerRecord, ApiError>,
  CreateIndexerVariables
>({
  mutationFn: (connector, { kind, payload }) => connector.createIndexer(kind, payload),
})

export function useCreateIndexer() {
  return useDomainMutation(createIndexerMutation)
}
